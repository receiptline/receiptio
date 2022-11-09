/*
Copyright 2021 Open Foodservice System Consortium

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const fs = require('fs/promises');
const net = require('net');
const stream = require('stream');
const decoder = require('string_decoder');
const receiptline = require('receiptline');
let serialport;
try {
    serialport = require('serialport');
}
catch (e) {
    // nothing to do
}
let puppeteer;
try {
    puppeteer = require('puppeteer');
}
catch (e) {
    // nothing to do
}
let sharp;
try {
    sharp = require('sharp');
}
catch (e) {
    // nothing to do
}

/**
 * Print receipts, get printer status, or convert to print images.
 * @param {string} receiptmd receipt markdown text
 * @param {string} [options] options ([-d destination] [-p printer] [-q] [-c chars] [-u] [-s] [-n] [-i] [-b threshold] [-g gamma] [-t timeout] [-l language])
 * @returns {string} print result, printer status, or print image
 */
const print = (receiptmd, options) => {

    return new Promise(async resolve => {
        // options
        const params = parseOption(options);
        const printer = convertOption(params);
        // print timeout
        const t = Number(params.t);
        const timeout = t >= 0 && t <= 3600 ? Math.trunc(t) : 300;
        // destination
        const dest = params.d;
        // state
        let state = 0;
        // connection
        let conn;
        // timer
        let tid = 0;
        let iid = 0;
        // close and resolve
        const close = res => {
            if (state > 0) {
                // close port
                conn.destroy();
                if (conn.isOpen) {
                    // serial
                    conn.close();
                }
                // clear timer
                clearTimeout(tid);
                clearInterval(iid);
                // closed
                state = 0;
            }
            // resolve with value
            resolve(res);
        };
        // start
        const start = () => {
            // opened
            state = 1;
            // drain
            let drain = true;
            // drain event
            conn.on('drain', () => {
                // write buffer is empty
                drain = true;
            });
            // receive buffer
            let buf = Buffer.alloc(0);
            // mode
            let mode = '';
            // data event
            conn.on('data', async data => {
                // append data
                buf = Buffer.concat([buf, data]);
                // parse response
                let len;
                do {
                    len = buf.length;
                    // process by mode
                    switch (mode) {
                        case 'escpos':
                            switch (state) {
                                case 1:
                                    // parse realtime status
                                    if ((buf[0] & 0x97) === 0x16) {
                                        // cover open
                                        close('coveropen');
                                    }
                                    else if ((buf[0] & 0xb3) === 0x32) {
                                        // paper empty
                                        close('paperempty');
                                    }
                                    else if ((buf[0] & 0xd3) === 0x52) {
                                        // clear timer
                                        clearTimeout(tid);
                                        clearInterval(iid);
                                        // error
                                        drain = conn.write('\x10\x05\x02', 'binary'); // DLE ENQ n
                                        // set timer
                                        tid = setTimeout(() => close('error'), 1000);
                                    }
                                    else if (params.q && (buf[0] & 0x93) === 0x12) {
                                        // online
                                        close('online');
                                    }
                                    else if ((buf[0] & 0x93) === 0x12) {
                                        // clear buffer
                                        buf = buf.subarray(buf.length);
                                        // clear timer
                                        clearTimeout(tid);
                                        clearInterval(iid);
                                        // ready
                                        state = 2;
                                        // automatic status back
                                        const asb = '\x1b@\x1da\xff'; // ESC @ GS a n
                                        // enable automatic status
                                        drain = conn.write(asb, 'binary');
                                        // set timer
                                        tid = setTimeout(() => {
                                            // no automatic status back
                                            const recover = '\x00'.repeat(8192) + asb;
                                            // flush out interrupted commands
                                            iid = setInterval(() => {
                                                // if drain
                                                if (drain) {
                                                    // retry to enable
                                                    drain = conn.write(recover, 'binary');
                                                }
                                            }, 1000);
                                            // set timer
                                            tid = setTimeout(() => close('offline'), 10000);
                                        }, 2000);
                                    }
                                    else {
                                        // other
                                        buf = buf.subarray(1);
                                    }
                                    break;

                                case 2:
                                case 3:
                                    // check response type
                                    if (buf[0] === 0x35 || buf[0] === 0x37 || buf[0] === 0x3b || buf[0] === 0x3d || buf[0] === 0x5f) {
                                        // block data
                                        const i = buf.indexOf(0);
                                        if (i > 0) {
                                            buf = buf.subarray(i);
                                        }
                                    }
                                    else if ((buf[0] & 0x90) === 0) {
                                        // status
                                        if (state === 3 && drain) {
                                            // success
                                            close('success');
                                        }
                                        else {
                                            // other
                                            buf = buf.subarray(1);
                                        }
                                    }
                                    else if ((buf[0] & 0x93) === 0x10) {
                                        // automatic status
                                        if (buf.length > 3) {
                                            if ((buf[1] & 0x90) === 0 && (buf[2] & 0x90) === 0 && (buf[3] & 0x90) === 0) {
                                                if ((buf[0] & 0x20) === 0x20) {
                                                    // cover open
                                                    close('coveropen');
                                                }
                                                else if ((buf[2] & 0x0c) === 0x0c) {
                                                    // paper empty
                                                    close('paperempty');
                                                }
                                                else if ((buf[1] & 0x2c) !== 0) {
                                                    // error
                                                    close('error');
                                                }
                                                else {
                                                    // normal
                                                    buf = buf.subarray(4);
                                                    // ready to print
                                                    if (state === 2) {
                                                        // clear timer
                                                        clearTimeout(tid);
                                                        clearInterval(iid);
                                                        // printing
                                                        state = 3;
                                                        // write command
                                                        drain = conn.write((await transform(receiptmd, printer)).replace(/^\x1b@\x1da\x00/, ''), 'binary');
                                                        // set timer
                                                        tid = setTimeout(() => close('timeout'), timeout * 1000);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    else {
                                        // other
                                        buf = buf.subarray(1);
                                    }
                                    break;

                                default:
                                    break;
                            }
                            break;

                        case 'sii':
                            switch (state) {
                                case 1:
                                    // clear buffer
                                    buf = buf.subarray(buf.length);
                                    // ready
                                    state = 2;
                                    // enable automatic status
                                    conn.write('\x1da\xff', 'binary'); // GS a n
                                    break;

                                case 2:
                                    // check response type
                                    if ((buf[0] & 0xf0) === 0xc0) {
                                        // automatic status
                                        if (buf.length > 7) {
                                            if ((buf[1] & 0xf8) === 0xd8) {
                                                // cover open
                                                close('coveropen');
                                            }
                                            else if ((buf[1] & 0xf1) === 0xd1) {
                                                // paper empty
                                                close('paperempty');
                                            }
                                            else if ((buf[0] & 0x0b) !== 0) {
                                                // error
                                                close('error');
                                            }
                                            else if (params.q) {
                                                // online
                                                close('online');
                                            }
                                            else {
                                                // normal
                                                buf = buf.subarray(8);
                                                // clear timer
                                                clearTimeout(tid);
                                                clearInterval(iid);
                                                // printing
                                                state = 3;
                                                // write command
                                                drain = conn.write((await transform(receiptmd, printer)).replace(/^\x1b@\x1da\x00/, ''), 'binary');
                                                // set timer
                                                tid = setTimeout(() => close('timeout'), timeout * 1000);
                                            }
                                        }
                                    }
                                    else {
                                        // other
                                        buf = buf.subarray(1);
                                    }
                                    break;

                                case 3:
                                    // check response type
                                    if ((buf[0] & 0xf0) === 0x80) {
                                        // status
                                        if (drain) {
                                            // success
                                            close('success');
                                        }
                                        else {
                                            // other
                                            buf = buf.subarray(1);
                                        }
                                        break;
                                    }
                                    else if ((buf[0] & 0xf0) === 0xc0) {
                                        // automatic status
                                        if (buf.length > 7) {
                                            if ((buf[1] & 0xf8) === 0xd8) {
                                                // cover open
                                                close('coveropen');
                                            }
                                            else if ((buf[1] & 0xf1) === 0xd1) {
                                                // paper empty
                                                close('paperempty');
                                            }
                                            else if ((buf[0] & 0x0b) !== 0) {
                                                // error
                                                close('error');
                                            }
                                            else {
                                                // normal
                                                buf = buf.subarray(8);
                                            }
                                        }
                                    }
                                    else {
                                        // other
                                        buf = buf.subarray(1);
                                    }
                                    break;

                                default:
                                    break;
                            }
                            break;

                        case 'star':
                            switch (state) {
                                case 1:
                                    // parse realtime status
                                    if ((buf[0] & 0xf1) === 0x21) {
                                        // calculate length
                                        const l = ((buf[0] >> 2 & 0x08) | (buf[0] >> 1 & 0x07)) + (buf[1] >> 6 & 0x02);
                                        // check length
                                        if (l <= buf.length) {
                                            // realtime status
                                            if ((buf[2] & 0x20) === 0x20) {
                                                // cover open
                                                close('coveropen');
                                            }
                                            else if ((buf[5] & 0x08) === 0x08) {
                                                // paper empty
                                                close('paperempty');
                                            }
                                            else if ((buf[3] & 0x2c) !== 0 || (buf[4] & 0x0a) !== 0) {
                                                // error
                                                close('error');
                                            }
                                            else if (params.q) {
                                                // online
                                                close('online');
                                            }
                                            else {
                                                // clear buffer
                                                buf = buf.subarray(buf.length);
                                                // clear timer
                                                clearTimeout(tid);
                                                clearInterval(iid);
                                                // ready
                                                state = 2;
                                                // write command
                                                drain = conn.write((await transform(receiptmd, printer))
                                                    .replace(/^(\x1b@)?\x1b\x1ea\x00/, '$1\x1b\x1ea\x01\x17')  // (ESC @) ESC RS a n ETB
                                                    .replace(/(\x1b\x1d\x03\x01\x00\x00\x04?|\x1b\x06\x01)$/, '\x17'), 'binary'); // ETB
                                                // set timer
                                                tid = setTimeout(() => close('timeout'), timeout * 1000);
                                            }
                                        }
                                    }
                                    break;

                                case 2:
                                case 3:
                                    // check response type
                                    if ((buf[0] & 0xf1) === 0x21) {
                                        // calculate length
                                        const l = ((buf[0] >> 2 & 0x08) | (buf[0] >> 1 & 0x07)) + (buf[1] >> 6 & 0x02);
                                        // check length
                                        if (l <= buf.length) {
                                            // automatic status
                                            if ((buf[2] & 0x20) === 0x20) {
                                                // cover open
                                                close('coveropen');
                                            }
                                            else if ((buf[5] & 0x08) === 0x08) {
                                                // paper empty
                                                close('paperempty');
                                            }
                                            else if ((buf[3] & 0x2c) !== 0 || (buf[4] & 0x0a) !== 0) {
                                                // error
                                                close('error');
                                            }
                                            else if (state === 3 && drain) {
                                                // success
                                                close('success');
                                            }
                                            else {
                                                // normal
                                                buf = buf.subarray(l);
                                                // printing
                                                state = 3;
                                            }
                                        }
                                    }
                                    else {
                                        // other
                                        buf = buf.subarray(1);
                                    }
                                    break;

                                default:
                                    break;
                            }
                            break;

                        default:
                            break;
                    }
                }
                while (buf.length > 0 && buf.length < len);
            });

            // select mode
            let hello = '';
            switch (printer.command) {
                case 'escpos':
                case 'citizen':
                case 'fit':
                case 'impact':
                case 'impactb':
                case 'generic':
                    mode = 'escpos'; // ESC/POS
                    hello = '\x10\x04\x02'; // DLE EOT n
                    break;
                case 'sii':
                    mode = 'sii'; // ESC/POS SII
                    hello = '\x1b@'; // ESC @
                    break;
                case 'starsbcs':
                case 'starmbcs':
                case 'starmbcs2':
                case 'starlinesbcs':
                case 'starlinembcs':
                case 'starlinembcs2':
                case 'emustarlinesbcs':
                case 'emustarlinembcs':
                case 'emustarlinembcs2':
                case 'stargraphic':
                    mode = 'star'; // StarPRNT, Star Line Mode, Star Graphic Mode
                    hello = '\x1b\x06\x01'; // ESC ACK SOH
                    break;
                default:
                    break;
            }
            // hello to printer
            drain = conn.write(hello, 'binary');
            // set timer
            tid = setTimeout(() => {
                // no hello back
                const recover = '\x00'.repeat(8192) + hello;
                // flush out interrupted commands
                iid = setInterval(() => {
                    // if drain
                    if (drain) {
                        // retry hello
                        drain = conn.write(recover, 'binary');
                    }
                }, 1000);
                // set timer
                tid = setTimeout(() => close('offline'), 10000);
            }, 2000);
        };

        // open port
        if (net.isIP(dest)) {
            // net
            conn = net.connect(9100, dest);
            // connect event
            conn.on('connect', start);
            // error event
            conn.on('error', err => {
                // disconnect
                close('disconnect');
            });
        }
        else if (await isSerialPort(dest)) {
            // serial
            if ('SerialPort' in serialport) {
                conn = new serialport.SerialPort({ path: dest, baudRate: 115200 });
            }
            else {
                conn = new serialport(dest, { baudRate: 115200 });
            }
            // open event
            conn.on('open', start);
            // error event
            conn.on('error', err => {
                // disconnect
                close('disconnect');
            });
        }
        else if (/^\/dev\/usb\/lp/.test(dest)) {
            try {
                // device node
                const handle = await fs.open(dest, 'r+');
                // read
                const rid = setInterval(async () => {
                    const { bytesRead, buffer } = await handle.read();
                    if (bytesRead > 0) {
                        conn.emit('data', buffer.subarray(0, bytesRead));
                    }
                }, 100);
                handle.on('close', () => clearInterval(rid));
                // write
                conn = handle.createWriteStream();
                // error event
                conn.on('error', err => {
                    // disconnect
                    close('disconnect');
                });
                setImmediate(start);
            }
            catch (e) {
                close('disconnect');
            }
        }
        else if (dest) {
            // disconnect
            close('disconnect');
        }
        else {
            // transform
            resolve(await transform(receiptmd, printer));
        }
    });
};

/**
 * Create a transform stream to print receipts, get printer status, or convert to print images.
 * @param {string} [options] options ([-d destination] [-p printer] [-q] [-c chars] [-u] [-s] [-n] [-i] [-b threshold] [-g gamma] [-t timeout] [-l language])
 * @returns {stream.Transform} transform stream
 */
const createPrint = options => {
    // options
    const params = parseOption(options);
    // transform
    if (params.d || /^png$/i.test(params.p) || params.i && (puppeteer || sharp)) {
        // create transform stream
        return new stream.Transform({
            construct(callback) {
                // initialize
                this.decoder = new decoder.StringDecoder('utf8');
                this.data = '';
                callback();
            },
            transform(chunk, encoding, callback) {
                // append chunk
                this.data += this.decoder.write(chunk);
                callback();
            },
            async flush(callback) {
                // convert receiptline to command
                const cmd = await print(this.data, options);
                this.push(cmd, params.d || /^(svg|text)$/i.test(params.p) ? 'utf8' : 'binary');
                callback();
            }
        });
    }
    else {
        return receiptline.createTransform(convertOption(params));
    }
};

const parseOption = options => {
    // parameters
    const params = {
        h: false, // show help
        d: '', // ip address or serial/usb port of target printer
        o: '', // file to output (if -d option is not found)
        p: '', // printer control language
        q: false, // check printer status without printing
        c: '-1', // characters per line
        u: false, // upside down
        s: false, // paper saving
        n: false, // no paper cut
        i: false, // print as image
        b: '-1', // image thresholding
        g: '-1', // image gamma correction
        t: '-1', // print timeout
        l: new Intl.NumberFormat().resolvedOptions().locale // language of source file
    };
    // arguments
    const argv = options ? options.split(' ') : [];
    // parse arguments
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        if (/^-[hqusni]$/.test(key)) {
            // option without value
            params[key[1]] = true;
        }
        else if (/^-[dopcbgtl]$/.test(key)) {
            // option with value
            if (i < argv.length - 1) {
                const value = argv[i + 1];
                if (/^[^-]/.test(value)) {
                    params[key[1]] = value;
                    i++;
                }
            }
        }
        else {
            // undefined option
        }
    }
    return params;
};

const convertOption = params => {
    // language
    let l = params.l.toLowerCase();
    l = l.slice(0, /^zh-han[st]/.test(l) ? 7 : 2);
    // command system
    let p = params.p.toLowerCase();
    if (!/^(svg|png|text|escpos|sii|citizen|fit|impactb?|generic|star(line|graphic)?|emustarline)$/.test(p)) {
        p = params.d ? 'escpos' : 'svg';
    }
    else if (/^(emu)?star(line)?$/.test(p)) {
        p += `${/^(ja|ko|zh)/.test(l) ? 'm' : 's'}bcs${/^(ko|zh)/.test(l) ? '2' : ''}`;
    }
    // language to codepage
    const codepage = {
        'ja': 'shiftjis', 'ko': 'ksc5601', 'zh': 'gb18030', 'zh-hans': 'gb18030', 'zh-hant': 'big5', 'th': 'tis620'
    };
    // string to number
    const c = Number(params.c);
    const b = Number(params.b);
    const g = Number(params.g);
    // options
    return {
        asImage: params.i,
        cpl: c >= 24 && c <= 48 ? Math.trunc(c) : 48,
        encoding: codepage[l] || 'multilingual',
        gradient: !(b >= 0 && b <= 255),
        gamma: g >= 0.1 && g <= 10.0 ? g : 1.8,
        threshold: b >= 0 && b <= 255 ? Math.trunc(b) : 128,
        upsideDown: params.u,
        spacing: !params.s,
        cutting: !params.n,
        command: p
    };
};

const transform = async (receiptmd, printer) => {
    // convert receiptline to png
    if (printer.command === 'png') {
        return await rasterize(receiptmd, printer, 'binary');
    }
    // convert receiptline to receiptline image
    if (printer.asImage && (puppeteer || sharp)) {
        receiptmd = `|{i:${await rasterize(receiptmd, printer, 'base64')}}`;
    }
    // convert receiptline to command
    return receiptline.transform(receiptmd, printer);
};

const rasterize = async (receiptmd, printer, encoding) => {
    // convert receiptline to png
    if (puppeteer) {
        const display = Object.assign({}, printer, { command: 'svg' });
        const svg = receiptline.transform(receiptmd, display);
        const w = Number(svg.match(/width="(\d+)px"/)[1]);
        const h = Number(svg.match(/height="(\d+)px"/)[1]);
        const browser = await puppeteer.launch({ defaultViewport: { width: w, height: h }});
        const page = await browser.newPage();
        await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;background:transparent}</style></head><body>${svg}</body></html>`);
        const png = await page.screenshot({ encoding: encoding, omitBackground: true });
        await browser.close();
        return png;
    }
    else if (sharp) {
        const display = Object.assign({}, printer, { command: svgsharp });
        const svg = receiptline.transform(receiptmd, display);
        return (await sharp(Buffer.from(svg)).toFormat('png').toBuffer()).toString(encoding);
    }
    else {
        return '';
    }
};

const svgsharp = Object.assign({}, receiptline.commands.svg, {
    // print text:
    text: function (text, encoding) {
        let p = this.textPosition;
        const attr = Object.keys(this.textAttributes).reduce((a, key) => a + ` ${key}="${this.textAttributes[key]}"`, '');
        this.textElement += this.arrayFrom(text, encoding).reduce((a, c) => {
            const w = this.measureText(c, encoding);
            const q = w * this.textScale;
            const r = (p + q / 2) * this.charWidth / this.textScale;
            p += q;
            const s = w * this.charWidth / 2;
            const t = attr.replace('scale(1,2)', `translate(${s}),scale(1,2)`).replace('scale(2,1)', `translate(${-s}),scale(2,1)`);
            return a + `<text x="${r}"${t}>${c.replace(/[ &<>]/g, r => ({' ': '&#xa0;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}[r]))}</text>`;
        }, '');
        this.textPosition += this.measureText(text, encoding) * this.textScale;
        return '';
    },
    // feed new line:
    lf: function () {
        const h = this.lineHeight * this.charWidth * 2;
        if (this.textElement.length > 0) {
            this.svgContent += `<g transform="translate(${this.lineMargin * this.charWidth},${this.svgHeight + h * 5 / 6})">${this.textElement}</g>`;
        }
        this.svgHeight += Math.max(h, this.feedMinimum);
        this.lineHeight = 1;
        this.textElement = '';
        this.textPosition = 0;
        return '';
    }
});

const isSerialPort = async destination => {
    let list = [];
    if (serialport) {
        if ('SerialPort' in serialport) {
            list = await serialport.SerialPort.list();
        }
        else {
            list = await serialport.list();
        }
    }
    return list.findIndex(port => port.path.toLowerCase() === destination.toLowerCase()) > -1;
};

module.exports = { print: print, createPrint: createPrint };
