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

const receiptio = require('receiptio');

const transaction = {
    datetime: new Date().toLocaleString(),
    items: [
        { name: 'Asparagus', quantity: 1, amount: 100 },
        { name: 'Broccoli', quantity: 2, amount: 200 },
        { name: 'Carrot', quantity: 3, amount: 300 },
    ],
    total: 600
};

const template = `^^^RECEIPT

${transaction.datetime}
${transaction.items.map(item => `${item.name} | ${item.quantity}| ${item.amount}`).join('\n')}
---
^TOTAL | ^${transaction.total}`;

receiptio.print(template, '-d 192.168.192.168 -p escpos -c 42').then(result => {
    console.log(result);
});
