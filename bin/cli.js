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
        'timeout': 106,
        '': 1
    };
    // print result
    let result = '';
    // source
    let source = '';
    // parse arguments
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        if (/^-[dpcbgtl]$/.test(key)) {
            // option with value
            i++;
        }
        else if (/^[^-]/.test(key)) {
            // source
            source = key;
        }
        else {
            // other
        }
    }
    // read and print
    if (source) {
        try {
            // read
            const data = fs.readFileSync(source).toString().replace(/^\ufeff/, '');
            // print
            result = await receiptio.print(data, argv.join(' '));
        }
        catch (e) {
            // error
            console.error(e.message);
        }
    } 
    // info
    console.info(result ? result : `
usage: receiptio [options] <source>
source:
  receipt markdown text file
  https://receiptline.github.io/designer/
options:
  -d <destination>  ip address or serial port of target printer (required)
  -p <printer>      printer control language (default: escpos)
                    (escpos, sii, citizen, fit, impact, impactb,
                     star, starline, emustarline, stargraphic)
  -c <chars>        characters per line (24-48) (default: 48)
  -u                upside down
  -s                paper saving (reduce line spacing)
  -n                no paper cut
  -i                print as image (requires convert-svg-to-png)
  -b <threshold>    image thresholding (0-255)
  -g <gamma>        image gamma correction (0.1-10.0) (default: 1.8)
  -t <timeout>      print timeout (sec) (default: 300)
  -l <language>     language of source file (default: system locale)
                    (en, fr, de, es, po, it, ru, ja, ko, zh-hans, zh-hant, ...)
result:
  success(0), coveropen(101), paperempty(102), error(103),
  offline(104), disconnect(105), timeout(106)
examples:
  receiptio -d COM1 receiptmd.txt
  receiptio -d /dev/ttyS0 -u -b 160 receiptmd.txt
  receiptio -d 192.168.192.168 -p escpos -c 42 receiptmd.txt`);
    // exit
    process.exit(code[result]);

})(process.argv.slice(2));
