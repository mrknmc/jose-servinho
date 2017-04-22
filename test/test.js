var assert = require('assert');
var sinon = require('sinon');
var bot = require('../bot');

describe('tests', function() {

    it('Should add user if not there yet', function() {
        var result = bot.addUser([1, 2], 3);
        assert.deepEqual(result, [1, 2, 3]);
    });

    it('Should not change anything if user there already', function() {
        var result = bot.addUser([1, 2, 3], 2);
        assert.deepEqual(result, [1, 2, 3]);
    });

    it('Should remove user if there already', function() {
        var result = bot.removeUser([1, 2, 3], 2);
        assert.deepEqual(result, [1, 3]);
    });

    it('Should not change anything if user not there yet', function() {
        var result = bot.removeUser([1, 2, 3], 4);
        assert.deepEqual(result, [1, 2, 3]);
    });

    it('Should get users by title of field', function() {
        var message = {
            original_message: {
                attachments: [
                    {
                        fields: [
                            {
                                value: 'eh',
                                title: 'meh'
                            }
                        ]
                    },
                    {
                        text: 'sometext'
                    },
                    {
                        fields: [
                            {
                                value: 'bah',
                                title: 'nah'
                            },
                            {
                                value: '<@user1>,<@user2>',
                                title: 'title'
                            }
                        ]
                    }
                ]
            }
        };

        var users = bot.getUsersByTitle(message, 'title');
        assert.deepEqual(users, ['user1', 'user2']);
    });

    it('Should return empty when no such field', function() {
        var message = {
            original_message: {
                attachments: [
                    {
                        fields: [
                            {
                                value: 'eh',
                                title: 'meh'
                            }
                        ]
                    },
                    {
                        text: 'sometext'
                    }
                ]
            }
        };

        var users = bot.getUsersByTitle(message, 'title');
        assert.deepEqual(users, []);
    });
});
