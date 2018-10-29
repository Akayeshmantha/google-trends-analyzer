module.exports = function(context, req) {
    const googleTrends = require('google-trends-api');
    var storage = require('azure-storage');
    var uuid = require('uuid');
    var connectionString = "";
    if (req.body.keyword != null) {
        var tableService = storage.createTableService(connectionString);
        var keyword = req.body.keyword;
        var jObject = {
            keyword: keyword,
        };
        (typeof(req.body.category) != typeof(undefined)) ? jObject.category = req.body.category: "";
        (typeof(req.body.timezone) != typeof(undefined)) ? jObject.category = req.body.timezone: "";
        (typeof(req.body.hl) != typeof(undefined)) ? jObject.h1 = req.body.hl: "";
        (typeof(req.body.geo) != typeof(undefined)) ? jObject.geo = req.body.geo: "";
        (typeof(req.body.endTime) != typeof(undefined)) ? jObject.endTime = new Date(req.body.endTime): "";
        (typeof(req.body.startTime) != typeof(undefined)) ? jObject.startTime = new Date(req.body.startTime): "";
        var finalInputObj = JSON.stringify(jObject);
        context.log(jObject);
        googleTrends.relatedQueries({ keyword: 'Westminster Dog Show' })
            .then((res) => {
                var query = new storage.TableQuery()
                    .where('PartitionKey eq ?', keyword);

                var entGen = storage.TableUtilities.entityGenerator;
                var rankedLise = JSON.parse(res).default;
                var metaDataOutput = {
                    rankedList: (typeof(rankedLise.rankedList) != typeof(undefined) ? rankedLise.rankedList : ""),
                    rankedKeyword: (typeof(rankedLise.rankedList.rankedKeyword) != typeof(undefined) ? rankedLise.rankedList.rankedKeyword : "")
                }
                context.log(finalInputObj);

                var metaDataInput = {
                    inputParameters: jObject
                }
                var exists = true;

                quertTable(query, finalInputObj, metaDataOutput).then((res) => {
                    var entity = {
                        metaDataOutput: entGen.String(JSON.stringify(metaDataOutput)),
                        metaDataInput: entGen.String(finalInputObj),
                        PartitionKey: entGen.String(keyword),
                        RowKey: entGen.String(uuid.v1())
                    };

                    tableService.insertOrReplaceEntity('trendsDB', entity, (error, result, response) => {
                        if (error) {
                            context.res = { status: 400, headers: { 'Content-Type': 'application/json' }, body: { '__err': error } };
                            context.done();
                        } else {
                            context.res = { status: 200, headers: { 'Content-Type': 'application/json' }, body: { 'results': entity } };
                            context.done();
                        }
                    });


                }).catch((err) => {
                    context.res = {
                        status: 400,
                        body: "" + err
                    };
                    context.done();
                });



            })
            .catch((err) => {
                context.res = {
                    status: 400,
                    body: "Error in finding the trend" + err
                };
                context.done();
            });

    } else {
        context.res = {
            status: 400,
            body: "Please pass the search term of interest"
        };
        context.done();
    }


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
                            reject("Already exists");
                        }
                    }

                    resolve("Create record");
                }
            });
        });
    }
};