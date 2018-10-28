module.exports = function(context, myTimer) {
    var timeStamp = new Date().toISOString();
    var storage = require('azure-storage');
    var uuid = require('uuid');
    var googleTrends = require('google-trends-api');
    var connectionString = "";
    var tableService = storage.createTableService(connectionString);
    let yesterday = new Date(Date.now() - 86400000);
    var yes_Start = new Date(yesterday.setHours(0, 0, 0, 0));
    var obje = { keyword: 'tshirts', geo: 'US', startTime: yes_Start };
    var finalInputObj = JSON.stringify(obje);

    googleTrends.relatedQueries(obje)
        .then((res) => {
            var query = new storage.TableQuery()
                .where('PartitionKey eq ?', 'tshirts');

            var entGen = storage.TableUtilities.entityGenerator;
            var rankedLise = JSON.parse(res).default;
            var metaDataOutput = {
                rankedList: (typeof(rankedLise.rankedList) != typeof(undefined) ? rankedLise.rankedList : ""),
                rankedKeyword: (typeof(rankedLise.rankedList.rankedKeyword) != typeof(undefined) ? rankedLise.rankedList.rankedKeyword : "")
            }
            context.log(finalInputObj);

            var metaDataInput = {
                inputParameters: finalInputObj
            }
            var exists = true;

            quertTable(query, finalInputObj, metaDataOutput).then((res) => {
                var entity = {
                    metaDataOutput: entGen.String(JSON.stringify(metaDataOutput)),
                    metaDataInput: entGen.String(finalInputObj),
                    PartitionKey: entGen.String('tshirts'),
                    RowKey: entGen.String(uuid.v1())
                };

                tableService.insertOrReplaceEntity('trendsDB', entity, (error, result, response) => {
                    if (error) {
                        // context.res = { status: 400, headers: { 'Content-Type': 'application/json' }, body: { '__err': error } };
                        context.log(error);
                        context.done();
                    } else {
                        // context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { 'results': entity } };
                        context.done();
                    }
                });


            }).catch((err) => {
                // context.res = {
                //     status: 400,
                //     body: "" + err
                // };
                context.log(err);
                context.done();
            });

        })
        .catch((err) => {
            context.log(err);
        })

    function quertTable(query, metaDataInput, metaDataOutput) {
        return new Promise((resolve, reject) => {
            tableService.queryEntities('trendsDB', query, null, function(error, result, response) {
                if (!error) {
                    var key = 0;
                    context.log(response);
                    for (key in response.body.value) {
                        var res = response.body.value[key].metaDataInput;
                        var outres = response.body.value[key].metaDataOutput;
                        if (res == metaDataInput && outres == JSON.stringify(metaDataOutput)) {
                            context.log("came");
                            reject("Already exists");
                        }
                    }

                    resolve("Create record");
                }
            });
        });
    }
};