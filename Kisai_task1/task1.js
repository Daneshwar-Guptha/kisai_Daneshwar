const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const typeData = {};

fs.createReadStream('rawData.csv')
    .pipe(csv())
    .on('data', (row) => {
        const type = row.type;
        const price = parseFloat(row.price);

        if (isNaN(price)) return;

        if (!typeData[type]) {
            typeData[type] = {
                total: 0,
                count: 0
            };
        }

        typeData[type].total += price;
        typeData[type].count += 1;
    })
    .on('end', async () => {
        const output = [];

        for (const type in typeData) {
            const average = typeData[type].total / typeData[type].count;

            output.push({type,count: typeData[type].count,average: average.toFixed(2)});
        }

        const writer = createObjectCsvWriter({
            path: 'type_summary.csv',
            header: [{ id: 'type', title: 'TYPE' },{ id: 'count', title: 'COUNT' },{ id: 'average', title: 'AVERAGE' }]
        });

        try {
            await writer.writeRecords(output);
            console.log(' created successfully');
        } catch (err) {
            console.error( err);
        }
    });
