# ReceiptIO

A print library for receipt printers, simple and easy API and CLI, printer status support.  

```javascript
const receiptio = require('receiptio');

const receiptmd = `^^^RECEIPT

12/18/2021, 11:22:33 AM
Asparagus | 1| 1.00
Broccoli  | 2| 2.00
Carrot    | 3| 3.00
---
^TOTAL | ^6.00`;

receiptio.print(receiptmd, '-d 192.168.192.168 -p escpos -c 42').then(result => {
    console.log(result);
});
```

```bash
$ more receiptmd.txt
^^^RECEIPT

12/18/2021, 11:22:33 AM
Asparagus | 1| 1.00
Broccoli  | 2| 2.00
Carrot    | 3| 3.00
---
^TOTAL | ^6.00

$ receiptio -d 192.168.192.168 -p escpos -c 42 receiptmd.txt
success
```

![receipt](example/example.png)  

# Features

ReceiptIO is a simple print library for receipt printers that prints with easy markdown data for receipts and returns printer status. Even without a printer, it can output images.  

A development tool is provided to edit and preview the receipt markdown.  
https://receiptline.github.io/designer/  

The details of the receipt markdown are explained at  
https://github.com/receiptline/receiptline  

# Receipt Printers

- Epson TM series
- Seiko Instruments RP series
- Star MC series
- Citizen CT series
- Fujitsu FP series

Connect with IP address, serial port, or Linux USB device file.  
(LAN, Bluetooth SPP, USB with virtual serial port driver, ...)  

# Installation

```bash
$ npm install -g receiptio
```

For USB connections on Linux, add a user to the `lp` group and reboot to access the device file.  

```bash
$ sudo gpasswd -a USER lp
```

If serial port is used, [Node SerialPort](https://www.npmjs.com/package/serialport) is also required.  

```bash
$ npm install -g serialport
```

When using `-i` (print as image) or `-p png` (convert to png) option, [puppeteer](https://www.npmjs.com/package/puppeteer) is also required.  

```bash
$ npm install -g puppeteer
```

# Usage

## API

```javascript
// async/await
const result = await receiptio.print(receiptmd, options);
console.log(result);

// promise
receiptio.print(receiptmd, options).then(result => {
    console.log(result);
});
```

### Method

`receiptio.print(receiptmd[, options])`  

### Parameters

- `receiptmd` &lt;string&gt;
  - receipt markdown text
    - https://receiptline.github.io/designer/
- `options` &lt;string&gt;
  - `-d <destination>`: ip address or serial/usb port of target printer
    - Without `-d` option, the destination is the return value
  - `-p <printer>`: printer control language
    - `escpos`: ESC/POS (Epson)
    - `sii`: ESC/POS (Seiko Instruments)
    - `citizen`: ESC/POS (Citizen)
    - `fit`: ESC/POS (Fujitsu)
    - `impact`: ESC/POS (TM-U220)
    - `impactb`: ESC/POS (TM-U220 Font B)
    - `star`: StarPRNT
    - `starline`: Star Line Mode
    - `emustarline`: Command Emulator Star Line Mode
    - `stargraphic`: Star Graphic Mode
    - `svg`: SVG
    - `png`: PNG (requires puppeteer)
    - default: `escpos` (with `-d` option) `svg` (without `-d` option)
  - `-q`: check printer status without printing
  - `-c <chars>`: characters per line
    - range: `24`-`48`
    - default: `48`
  - `-u`: upside down
  - `-s`: paper saving (reduce line spacing)
  - `-n`: no paper cut
  - `-i`: print as image (requires puppeteer)
  - `-b <threshold>`: image thresholding
    - range: `0`-`255`
  - `-g <gamma>`: image gamma correction
    - range: `0.1`-`10.0`
    - default: `1.8`
  - `-t <timeout>`: print timeout (sec)
    - range: `0`-`3600`
    - default: `300`
  - `-l <language>`: language of receipt markdown text
    - `en`, `fr`, `de`, `es`, `po`, `it`, `ru`, ...: Multilingual (cp437, 852, 858, 866, 1252 characters)
    - `ja`: Japanese (shiftjis characters)
    - `ko`: Korean (ksc5601 characters)
    - `zh-hans`: Simplified Chinese (gb18030 characters)
    - `zh-hant`: Traditional Chinese (big5 characters)
    - default: system locale

### Return value

- With `-d` option &lt;string&gt;
  - `success`: printing success
  - `online`: printer is online
  - `coveropen`: printer cover is open
  - `paperempty`: no receipt paper
  - `error`: printer error (except cover open and paper empty)
  - `offline`: printer is off or offline
  - `disconnect`: printer is not connected
  - `timeout`: print timeout
- Without `-d` option &lt;string&gt;
  - printer commands or images

## Transform stream API

`receiptio.createPrint()` method is the stream version of the `receiptio.print()`.  

```javascript
const fs = require('fs');
const receiptio = require('receiptio');

const source = fs.createReadStream('example.txt');
const transform = receiptio.createPrint('-p svg');
const destination = fs.createWriteStream('example.svg');

source.pipe(transform).pipe(destination);
```

### Method

`receiptio.createPrint([options])`  

### Parameters

- `options` &lt;string&gt;

### Return value

- Transform stream &lt;stream.Transform&gt;

## CLI

The options are almost the same as for API.  

```console
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
                     star, starline, emustarline, stargraphic,
                     svg, png) (png requires puppeteer)
  -q                check printer status without printing
  -c <chars>        characters per line (24-48) (default: 48)
  -u                upside down
  -s                paper saving (reduce line spacing)
  -n                no paper cut
  -i                print as image (requires puppeteer)
  -b <threshold>    image thresholding (0-255)
  -g <gamma>        image gamma correction (0.1-10.0) (default: 1.8)
  -t <timeout>      print timeout (0-3600 sec) (default: 300)
  -l <language>     language of source file (default: system locale)
                    (en, fr, de, es, po, it, ru, ja, ko, zh-hans, zh-hant, ...)
print results:
  success(0), online(100), coveropen(101), paperempty(102),
  error(103), offline(104), disconnect(105), timeout(106)
examples:
  receiptio -d COM1 receiptmd.txt
  receiptio -d /dev/usb/lp0 receiptmd.txt
  receiptio -d /dev/ttyS0 -u -b 160 receiptmd.txt
  receiptio -d 192.168.192.168 -p escpos -c 42 receiptmd.txt
  receiptio -d com9 -p impact -q
  receiptio receiptmd.txt -o receipt.svg
  receiptio receiptmd.txt -p escpos -i -b 128 -g 1.0 -o receipt.prn
  receiptio < receiptmd.txt -p png > receipt.png
  echo {c:1234567890} | receiptio | more
```

# License

- Apache License, Version 2.0
