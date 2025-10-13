# Changelog

## [2.1.3] - 2025-10-13
### Fixed
- Bugs in UPC and EAN for SII Landscape
- Redundant code

## [2.1.2] - 2025-01-19
### Fixed
- For bug fixes in sharp v0.32.4

## [2.1.1] - 2025-01-18
### Fixed
- Help messages

## [2.1.0] - 2025-01-17
### Added
- Automatic detection by output file extension

## [2.0.0] - 2025-01-11
### Added
- Automatic printer detection
- Cash drawer status
- "txt" alias for text

### Changed
- Default gamma correction value to match Receipt.js

### Fixed
- Buffer length check
- Missing socket write result save
- XOFF flow control setting for serial port

## [1.9.0] - 2023-11-15
### Added
- Support for new headless mode of puppeteer
- Serial port options

### Changed
- File extension from .txt to .receipt

## [1.8.0] - 2023-02-20
### Added
- Print margin

## [1.7.1] - 2023-01-19
### Fixed
- A bug that disabled landscape orientation in file/standard output

## [1.7.0] - 2022-12-12
### Added
- "starimpact" for Star impact printers

## [1.6.1] - 2022-11-16
### Fixed
- README

## [1.6.0] - 2022-11-09
### Added
- Landscape orientation
- "epson" alias for escpos
- "generic" for generic escpos
- "text" for plain text output

### Fixed
- Deprecated buf.slice to buf.subarray

## [1.5.0] - 2022-06-13
### Added
- TypeScript typings
- JSDoc annotations

## [1.4.0] - 2022-04-16
### Added
- Support for image processing module "sharp"
- Thai character support

## [1.3.0] - 2022-03-12
### Added
- Option to check printer status without printing

## [1.2.0] - 2022-03-08
### Added
- Image output (SVG and PNG)
- Pipeline and redirection support
- Transform stream API
- Support for Node SerialPort 10.x

### Changed
- convert-svg-to-png to puppeteer

## [1.1.0] - 2022-02-03
### Added
- USB connection support for Linux

## [1.0.0] - 2021-12-19
### Added
- First edition
