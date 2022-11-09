/*
Copyright 2022 Open Foodservice System Consortium

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

declare module 'receiptio' {
    import { Transform } from 'node:stream';
    /**
     * Print receipts, get printer status, or convert to print images.
     * @param {string} receiptmd receipt markdown text
     * @param {string} [options] options ([-d destination] [-p printer] [-q] [-c chars] [-u] [-v] [-r] [-s] [-n] [-i] [-b threshold] [-g gamma] [-t timeout] [-l language])
     * @returns {Promise<string>} print result, printer status, or print image
     */
    export function print(receiptmd: string, options?: string): Promise<string>;
    /**
     * Create a transform stream to print receipts, get printer status, or convert to print images.
     * @param {string} [options] options ([-d destination] [-p printer] [-q] [-c chars] [-u] [-v] [-r] [-s] [-n] [-i] [-b threshold] [-g gamma] [-t timeout] [-l language])
     * @returns {Transform} transform stream
     */
    export function createPrint(options?: string): Transform;
}
