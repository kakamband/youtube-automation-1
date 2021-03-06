const fs = require("fs");
const ga = require("./google-auth");
const settings = require('./settings');
const {google} = require('googleapis');

function getSubscriptions(auth, nextPageToken, subscriptions = []) { 
    let youtube = google.youtube('v3');
    return new Promise((resolve, reject) => {
        youtube.subscriptions.list({
                auth: auth,
                part: 'snippet,contentDetails',
                mine: true,
                maxResults: 5,
                pageToken: nextPageToken,
            }, 
            function(err, response) {
                if (err) 
                    return reject({ message: 'The API returned an error: ' + err });

                let items = response.data.items;
                if (items.length == 0)
                    return reject({ message:'No channel found.' });
                                    
                subscriptions.push.apply(subscriptions, items);
                resolve({ nextPageToken: response.data.nextPageToken, subscriptions: subscriptions });
            }
        );
    })
    .then(result => {
        if(result.nextPageToken)
            return getSubscriptions(auth, result.nextPageToken, result.subscriptions);
        return result;
    });
}

async function main() {    
    let credentials = ga.getCredentials('../.google-credentials', settings.exportFromAccount);
    ga.createOauth2Client(credentials)
    .then(auth => {        
        return getSubscriptions(auth, undefined);
    })
    .then(result => {
        let path = './output';
        if(!fs.existsSync(path))
            fs.mkdirSync(path);
        path += `/${credentials.account}`;
        if(!fs.existsSync(path))
            fs.mkdirSync(path);

        path += '/subscriptions.json';
        fs.writeFileSync(path, JSON.stringify(result.subscriptions, null, 4));
        console.log(`Subscriptions saved to '${path}': ${result.subscriptions.length} items.`);
    })
    .catch(error => {
        console.log(error);
    });
}
main();