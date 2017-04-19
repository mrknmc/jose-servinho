var Botkit = require('botkit');
var mongoStorage = require('botkit-storage-mongo')({
    mongoUri: process.env.MONGODB_URI
});


function makeInitialMessage(signedUp) {
    var msg = {
        "text": "Sign up open for next Monday night! 7pm, £3 at Peffermill as usual.",
        "attachments": [
            {
                "text": "Are you in?",
                "color": "#3AA3E3",
                "callback_id": "initial",
                "attachment_type": "default",
                "fields": [
                ],
                "actions": [
                    {
                        "name": "imIn",
                        "text": ":soccer: I'm in",
                        "style": "primary",
                        "type": "button",
                        "value": true,
                    },
                    {
                        "name": "notIn",
                        "text": "I'm not in",
                        "style": "danger",
                        "type": "button",
                        "value": true,
                    }
                ]
            }
        ]
    };
    if (signedUp.length > 0) {
        msg.attachments[0].fields.push({
            "title": "Signed up",
            "value": signedUp.join(),
        });
    }
    return msg;
}


function makeFinalMessage(signedUp) {
    return {
        "text": "Sign up open for next Monday night! 7pm, £3 at Peffermill as usual.",
        "attachments": [
            {
                "text": "That's all folks",
                "color": "#3AA3E3",
                "callback_id": "final",
                "attachment_type": "default",
                "fields": [
                    {
                        "title": "Signed up",
                        "value": signedUp.join(),
                    }
                ],
                "actions": [
                    {
                        "name": "notIn",
                        "text": "I'm not in",
                        "style": "danger",
                        "type": "button",
                        "value": true,
                    }
                ]
            }
        ]
    };
}


function makeMessage(signedUp) {
    if (signedUp.length == 10) {
        return makeFinalMessage(signedUp);
    } else {
        return makeInitialMessage(signedUp);
    }

}

function removeUser(userList, user) {
    var idx = userList.indexOf(user);
    if (idx > -1) {
        userList.splice(idx, 1);
    }
    return userList;
}


function addUser(userList, user) {
    var idx = userList.indexOf(user);
    if (idx == -1) {
        userList.push(user);
    }
    return userList;
}


function addUsers(userList, usersToAdd) {
    for (var i = 0; i++; i < usersToAdd.length) {
        var userToAdd = usersToAdd[i];
        addUser(userList, userToAdd);
    }
    return userList;
}


var controller = Botkit.slackbot({
    debug: false,
    storage: mongoStorage
}).configureSlackApp({
    // rtm_receive_messages: false,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    scopes: ['commands', 'users:read', 'chat:write:bot'],
});

controller.setupWebserver(process.env.PORT, function(err, webserver) {
    controller.createWebhookEndpoints(webserver);

    controller.createOauthEndpoints(controller.webserver, function(err,req,res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});


controller.on('interactive_message_callback', function(bot, message) {
    if (message.callback_id !== 'initial' && message.callback_id !== 'final') {
        return;
    }

    var action = message.actions[0].name;
    console.log(JSON.stringify(bot.api));
    console.log(JSON.stringify(bot.api.users));
    console.log(JSON.stringify(bot.api.users.info));
    bot.api.users.info({user: message.user}, function(error, resp) {
        console.log(resp);
        var username = resp.user.name;
        controller.storage.channels.get(message.channel, function(err, data) {
            var signedUp = data.signedUp;
            var initiatedBy = data.initiatedBy;
            if (action == 'notIn') {
                removeUser(signedUp, username);
                // bot.replyPrivateDelayed(message, 'Yo, you should let the team know you pulled out.');
            } else if (action == 'imIn') {
                addUser(signedUp, username);
            }
            bot.replyInteractive(message, makeMessage(signedUp));
            controller.storage.channels.save({
                id: message.channel,
                initiatedBy: initiatedBy,
                originalMessage: data.originalMessage,
                signedUp: signedUp
            });
        });
    });
});


controller.on('slash_command', function(bot, message) {
    if (message.command !== '/jose') {
        return;
    }
    if (message.text.startsWith('start')) {
        var players = message.text.slice(5).split(' ').splice(1);
        bot.replyPublic(message, makeInitialMessage(players));
        controller.storage.channels.save({
            id: message.channel,
            initiatedBy: message.user,
            originalMessage: message,
            signedUp: players
        });
        // bot.replyPrivateDelayed(message, 'Type /jose add <player name> to add players manually.');
    } else if (message.text.startsWith('add')) {
        // controller.storage.channels.get(message.channel, function(err, data) {
            // if (data.initiatedBy === message.user) {
                // var players = message.text.slice(5).split(' ').splice(1);
                // addUsers(data.signedUp, players);
                // bot.replyInteractive(data.originalMessage, makeMessage(data.signedUp));
                // controller.storage.channels.save({
                    // id: message.channel,
                    // initiatedBy: data.initiatedBy,
                    // originalMessage: data.originalMessage,
                    // signedUp: data.signedUp
                // }, function(err) {
                    // if (err) {
                        // console.log(err);
                    // }
                // });
            // } else {
                // bot.replyPrivateDelayed(message, 'Only the person who initiated the poll can add players manually.');
            // }
        // });
    }

    // and then continue to use replyPublicDelayed or replyPrivateDelayed
    // bot.replyPublicDelayed(message, 'This is a public reply to the ' + message.command + ' slash command!');

    // bot.replyPrivateDelayed(message, ':dash:');
});
