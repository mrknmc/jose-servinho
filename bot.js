var Botkit = require('botkit');
var mongoStorage = require('botkit-storage-mongo')({
    mongoUri: process.env.MONGODB_URI || 'localhost'
});


function makeMessage(signedUp, dropouts) {
    var msg = {
        "text": "Sign up open for football fives next Monday night! 7pm, £3 at Peffermill as usual.",
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
                        "style": "default",
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
    if (dropouts.length > 0) {
        msg.attachments[0].fields.push({
            "title": "Dropped out",
            "value": dropouts.map(function (user) {
                return '<@' + user + '>';
            }).join(),
        });
    }
    if (signedUp.length > 0) {
        msg.attachments[0].fields.push({
            "title": "Signed up",
            "value": signedUp.map(function (user) {
                return '<@' + user + '>';
            }).join(),
        });
    }
    if (signedUp.length == 10) {
        msg.attachments[0].actions.push({
            "name": "close",
            "text": "Close",
            "style": "primary",
            "type": "button",
            "value": true,
        });
    }
    return msg;
}


function makeFinalMessage(signedUp, dropouts) {
    return {
        "text": "Sign up for football fives closed! :tada:",
        "attachments": [
            {
                "color": "good",
                "callback_id": "final",
                "attachment_type": "default",
                "fields": [
                    {
                        "title": "Signed up",
                        "value": signedUp.map(function (user) {
                            return '<@' + user + '>';
                        }).join(),
                    },
                    {
                        "title": "Location",
                        "value": "Peffermill",
                        "short": true
                    },
                    {
                        "title": "Time",
                        "value": "7pm",
                        "short": true
                    }
                ]
            }
        ]
    };
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


function getUsersByTitle(message, title) {
    var attachments = message.original_message.attachments;
    for (i = 0; i < attachments.length ; i++) {
        var attachment = attachments[i];
        if (!attachment.fields) {
            continue;
        }
        var field = attachment.fields.find(function (f) {
            return f.title == title;
        });
        if (!field) {
            continue;
        }
        return field.value.split(',').map(function (u) {
            return u.substring(2, u.length - 1);
        });
    }
    return [];
}

function getDropouts(message) {
    return getUsersByTitle(message, 'Dropped out');
}


function getSignedUp(message) {
    return getUsersByTitle(message, 'Signed up');
}

function run() {
    var controller = Botkit.slackbot({
        debug: false,
        storage: mongoStorage
    }).configureSlackApp({
        // rtm_receive_messages: false,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: ['commands', 'chat:write:bot'],
    });

    controller.setupWebserver(process.env.PORT, function(err, webserver) {
        controller.createWebhookEndpoints(webserver);
        controller.createOauthEndpoints(webserver, function(err, req, res) {
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
        var username = message.user;

        var signedUp = getSignedUp(message);
        var dropouts = getDropouts(message);

        if (action == 'notIn') {
            removeUser(signedUp, username);
            addUser(dropouts, username);
            bot.replyInteractive(message, makeMessage(signedUp, dropouts));
        } else if (action == 'imIn') {
            removeUser(dropouts, username);
            addUser(signedUp, username);
            bot.replyInteractive(message, makeMessage(signedUp, dropouts));
        } else if (action == 'close') {
            bot.replyInteractive(message, makeFinalMessage(signedUp, dropouts));
        }
    });


    controller.on('slash_command', function(bot, message) {
        if (message.command !== '/jose') {
            return;
        }
        bot.replyPublic(message, makeMessage([], []));
    });

}

if (require.main === module) {
    run();
}

exports.addUser = addUser;
exports.removeUser = removeUser;
exports.getUsersByTitle = getUsersByTitle;
