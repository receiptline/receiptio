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

ReceiptIO is a simple print library for receipt printers that prints with easy markdown data for receipts and returns printer status.  

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

If USB is used on Linux, add a user to the `lp` group and reboot to access the device file.  

```bash
$ sudo gpasswd -a USER lp
```

If serial port is used, [Node SerialPort](https://www.npmjs.com/package/serialport) is also required.  

```bash
$ npm install serialport
```

When using `-i` option (print as image), [convert-svg-to-png](https://www.npmjs.com/package/convert-svg-to-png) is also required.  

```bash
$ npm install convert-svg-to-png
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

`receiptio.print(receiptmd, options)`  

### Parameters

- `receiptmd` &lt;string&gt;
  - receipt markdown text
    - https://receiptline.github.io/designer/
- `options` &lt;string&gt;
  - `-d <destination>`: ip address or serial port of target printer
    - required
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
    - default: `escpos`
  - `-c <chars>`: characters per line
    - range: `24`-`48`
    - default: `48`
  - `-u`: upside down
  - `-s`: paper saving (reduce line spacing)
  - `-n`: no paper cut
  - `-i`: print as image (requires convert-svg-to-png)
  - `-b <threshold>`: image thresholding
    - range: `0`-`255`
  - `-g <gamma>`: image gamma correction
    - range: `0.1`-`10.0`
    - default: `1.8`
  - `-t <timeout>`: print timeout (sec)
    - default: `300`
  - `-l <language>`: language of receipt markdown text
    - `en`, `fr`, `de`, `es`, `po`, `it`, `ru`, ...: Multilingual (cp437, 852, 858, 866, 1252 characters)
    - `ja`: Japanese (shiftjis characters)
    - `ko`: Korean (ksc5601 characters)
    - `zh-hans`: Simplified Chinese (gb18030 characters)
    - `zh-hant`: Traditional Chinese (big5 characters)
    - default: system locale

### Return value

- &lt;string&gt;
  - `success`: printing success
  - `coveropen`: printer cover is open
  - `paperempty`: no receipt paper
  - `error`: printer error (except cover open and paper empty)
  - `offline`: printer is off or offline
  - `disconnect`: printer is not connected
  - `timeout`: print timeout

## CLI

The options are the same as for API.  

```console
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
  receiptio -d /dev/usb/lp0 receiptmd.txt
  receiptio -d /dev/ttyS0 -u -b 160 receiptmd.txt
  receiptio -d 192.168.192.168 -p escpos -c 42 receiptmd.txt
```

# License

- Apache License, Version 2.0
