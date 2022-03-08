#!/usr/bin/env node
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

const fs = require('fs');
const stream = require('stream/promises');
const receiptio = require('receiptio');

(async argv => {

    // error code
    const code = {
        'success': 0,
        'coveropen': 101,
        'paperempty': 102,
        'error': 103,
        'offline': 104,
        'disconnect': 105,
        'timeout': 106
    };
    // print result
    let result = '';
    // result receiver
    const receiver = async readable => {
        readable.setEncoding('utf8');
        for await (const chunk of readable) {
            result += chunk;
        }
    };
    // source
    let source = '';
    // parameters
    const params = {
        h: false, // show help
        d: '', // ip address or serial/usb port of target printer
        o: '' // file to output (if -d option is not found)
    };
    // parse arguments
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        if (/^-[husni]$/.test(key)) {
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
        else if (/^[^-]/.test(key)) {
            // source
            source = key;
        }
        else {
            // other
        }
    }
    if (params.h) {
        // show help
        console.error(`
usage: receiptio [options] [source]
source:
  receipt markdown text file
  https://receiptline.github.io/designer/
  if source is not found, standard input
options:
  -h                show help
  -d <destination>  ip address or serial/usb port of target printer
  -o <outfile>      file to output (if -d option is not found)
                    if -d and -o are not found, standard output
  -p <printer>      printer control language
                    (default: escpos if -d option is found, svg otherwise)
                    (escpos, sii, citizen, fit, impact, impactb,
                     star, starline, emustarline, stargraphic)
  -c <chars>        characters per line (24-48) (default: 48)
  -u                upside down
  -s                paper saving (reduce line spacing)
  -n                no paper cut
  -i                print as image (requires convert-svg-to-png)
  -b <threshold>    image thresholding (0-255)
  -g <gamma>        image gamma correction (0.1-10.0) (default: 1.8)
  -t <timeout>      print timeout (0-3600 sec) (default: 300)
  -l <language>     language of source file (default: system locale)
                    (en, fr, de, es, po, it, ru, ja, ko, zh-hans, zh-hant, ...)
print results:
  success(0), coveropen(101), paperempty(102), error(103),
  offline(104), disconnect(105), timeout(106)
examples:
  receiptio -d COM1 receiptmd.txt
  receiptio -d /dev/usb/lp0 receiptmd.txt
  receiptio -d /dev/ttyS0 -u -b 160 receiptmd.txt
  receiptio -d 192.168.192.168 -p escpos -c 42 receiptmd.txt
  receiptio receiptmd.txt -o receipt.prn
  receiptio receiptmd.txt -p escpos -i -b 128 -g 1.0 -o receipt.prn
  receiptio < receiptmd.txt > receipt.prn
  echo {c:1234567890} | receiptio | more`);
        process.exitCode = 1;
    }
    else {
        // options
        const options = argv.join(' ');
        // source
        const input = source ? fs.createReadStream(source) : process.stdin;
        // destination
        const output = params.d ? receiver : params.o ? fs.createWriteStream(params.o) : process.stdout;
        // print or transform
        await stream.pipeline(input, receiptio.createPrint(options), output).then(() => {
            // result
            if (result) {
                console.error(result);
                process.exitCode = code[result];
            }
        }).catch(e => {
            // error
            console.error(e.message);
            process.exitCode = 1;
        });
    }

})(process.argv.slice(2));
