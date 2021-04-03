"use strict";

const {strict: assert} = require("assert");

const {stub_templates} = require("../zjsunit/handlebars");
const {zrequire} = require("../zjsunit/namespace");
const {run_test} = require("../zjsunit/test");
const {page_params} = require("../zjsunit/zpage_params");

const settings_config = zrequire("settings_config");
const pm_conversations = zrequire("pm_conversations");

const recent_senders = zrequire("recent_senders");
const peer_data = zrequire("peer_data");
const people = zrequire("people");
const stream_data = zrequire("stream_data");

const emoji = zrequire("../shared/js/emoji");
const pygments_data = zrequire("../generated/pygments_data.json");
const actual_pygments_data = {...pygments_data};
const ct = zrequire("composebox_typeahead");
const th = zrequire("typeahead_helper");

let next_id = 0;

function assertSameEmails(lst1, lst2) {
    assert.deepEqual(
        lst1.map((r) => r.email),
        lst2.map((r) => r.email),
    );
}

const a_bot = {
    email: "a_bot@zulip.com",
    full_name: "A Zulip test bot",
    is_admin: false,
    is_bot: true,
    user_id: 1,
};

const a_user = {
    email: "a_user@zulip.org",
    full_name: "A Zulip user",
    is_admin: false,
    is_bot: false,
    user_id: 2,
};

const b_user_1 = {
    email: "b_user_1@zulip.net",
    full_name: "Bob 1",
    is_admin: false,
    is_bot: false,
    user_id: 3,
};

const b_user_2 = {
    email: "b_user_2@zulip.net",
    full_name: "Bob 2",
    is_admin: true,
    is_bot: false,
    user_id: 4,
};

const b_user_3 = {
    email: "b_user_3@zulip.net",
    full_name: "Bob 3",
    is_admin: false,
    is_bot: false,
    user_id: 5,
};

const b_bot = {
    email: "b_bot@example.com",
    full_name: "B bot",
    is_admin: false,
    is_bot: true,
    user_id: 6,
};

const zman = {
    email: "zman@test.net",
    full_name: "Zman",
    is_admin: false,
    is_bot: false,
    user_id: 7,
};

const matches = [a_bot, a_user, b_user_1, b_user_2, b_user_3, b_bot, zman];

for (const person of matches) {
    people.add_active_user(person);
}

stream_data.create_streams([
    {name: "Dev", color: "blue", stream_id: 1},
    {name: "Linux", color: "red", stream_id: 2},
]);

function test(label, f) {
    run_test(label, (override) => {
        pm_conversations.clear_for_testing();
        recent_senders.clear_for_testing();
        peer_data.clear_for_testing();
        people.clear_recipient_counts_for_testing();
        page_params.is_admin = false;
        page_params.realm_is_zephyr_mirror_realm = false;
        page_params.realm_email_address_visibility =
            settings_config.email_address_visibility_values.admins_only.code;

        f(override);
    });
}

test("sort_streams", (override) => {
    let test_streams = [
        {
            stream_id: 101,
            name: "Dev",
            pin_to_top: false,
            stream_weekly_traffic: 0,
            subscribed: true,
        },
        {
            stream_id: 102,
            name: "Docs",
            pin_to_top: false,
            stream_weekly_traffic: 100,
            subscribed: true,
        },
        {
            stream_id: 103,
            name: "Derp",
            pin_to_top: false,
            stream_weekly_traffic: 0,
            subscribed: true,
        },
        {
            stream_id: 104,
            name: "Denmark",
            pin_to_top: true,
            stream_weekly_traffic: 100,
            subscribed: true,
        },
        {
            stream_id: 105,
            name: "dead",
            pin_to_top: false,
            stream_weekly_traffic: 0,
            subscribed: true,
        },
    ];

    override(stream_data, "is_active", (sub) => sub.name !== "dead");

    test_streams = th.sort_streams(test_streams, "d");
    assert.deepEqual(test_streams[0].name, "Denmark"); // Pinned streams first
    assert.deepEqual(test_streams[1].name, "Docs"); // Active streams next
    assert.deepEqual(test_streams[2].name, "Derp"); // Less subscribers
    assert.deepEqual(test_streams[3].name, "Dev"); // Alphabetically last
    assert.deepEqual(test_streams[4].name, "dead"); // Inactive streams last

    // Test sort streams with description
    test_streams = [
        {
            stream_id: 201,
            name: "Dev",
            description: "development help",
            subscribed: true,
        },
        {
            stream_id: 202,
            name: "Docs",
            description: "writing docs",
            subscribed: true,
        },
        {
            stream_id: 203,
            name: "Derp",
            description: "derping around",
            subscribed: true,
        },
        {
            stream_id: 204,
            name: "Denmark",
            description: "visiting Denmark",
            subscribed: true,
        },
        {
            stream_id: 205,
            name: "dead",
            description: "dead stream",
            subscribed: true,
        },
    ];

    test_streams = th.sort_streams(test_streams, "wr");
    assert.deepEqual(test_streams[0].name, "Docs"); // Description match
    assert.deepEqual(test_streams[1].name, "Denmark"); // Popular stream
    assert.deepEqual(test_streams[2].name, "Derp"); // Less subscribers
    assert.deepEqual(test_streams[3].name, "Dev"); // Alphabetically last
    assert.deepEqual(test_streams[4].name, "dead"); // Inactive streams last

    // Test sort both subscribed and unsubscribed streams.
    test_streams = [
        {
            stream_id: 301,
            name: "Dev",
            description: "Some devs",
            subscribed: true,
        },
        {
            stream_id: 302,
            name: "East",
            description: "Developing east",
            subscribed: true,
        },
        {
            stream_id: 303,
            name: "New",
            description: "No match",
            subscribed: true,
        },
        {
            stream_id: 304,
            name: "Derp",
            description: "Always Derping",
            subscribed: false,
        },
        {
            stream_id: 305,
            name: "Ether",
            description: "Destroying ether",
            subscribed: false,
        },
        {
            stream_id: 306,
            name: "Mew",
            description: "Cat mews",
            subscribed: false,
        },
    ];

    test_streams = th.sort_streams(test_streams, "d");
    assert.deepEqual(test_streams[0].name, "Dev"); // Subscribed and stream name starts with query
    assert.deepEqual(test_streams[1].name, "Derp"); // Unsubscribed and stream name starts with query
    assert.deepEqual(test_streams[2].name, "East"); // Subscribed and description starts with query
    assert.deepEqual(test_streams[3].name, "Ether"); // Unsubscribed and description starts with query
    assert.deepEqual(test_streams[4].name, "New"); // Subscribed and no match
    assert.deepEqual(test_streams[5].name, "Mew"); // Unsubscribed and no match
});

test("sort_languages", () => {
    Object.assign(pygments_data, {
        langs: {
            python: {priority: 40},
            javscript: {priority: 50},
            php: {priority: 38},
            pascal: {priority: 29},
            perl: {priority: 22},
            css: {priority: 0},
        },
    });

    let test_langs = ["pascal", "perl", "php", "python", "javascript"];
    test_langs = th.sort_languages(test_langs, "p");

    // Sort languages by matching first letter, and then by popularity
    assert.deepEqual(test_langs, ["python", "php", "pascal", "perl", "javascript"]);

    // Test if popularity between two languages are the same
    pygments_data.langs.php = {priority: 40};
    test_langs = ["pascal", "perl", "php", "python", "javascript"];
    test_langs = th.sort_languages(test_langs, "p");

    assert.deepEqual(test_langs, ["php", "python", "pascal", "perl", "javascript"]);

    // Some final tests on the actual pygments data to check ordering.
    //
    // We may eventually want to use human-readable names like
    // "JavaScript" with several machine-readable aliases for what the
    // user typed, which might help provide a better user experience.
    Object.assign(pygments_data, actual_pygments_data);
    test_langs = ["j", "java", "javascript", "js"];

    // Sort acccording to priority only.
    test_langs = th.sort_languages(test_langs, "jav");
    assert.deepEqual(test_langs, ["javascript", "java", "js", "j"]);

    // Push exact matches to top, regardless of priority
    test_langs = th.sort_languages(test_langs, "java");
    assert.deepEqual(test_langs, ["java", "javascript", "js", "j"]);
    test_langs = th.sort_languages(test_langs, "j");
    assert.deepEqual(test_langs, ["j", "javascript", "java", "js"]);
});

function get_typeahead_result(query, current_stream, current_topic) {
    const result = th.sort_recipients(
        people.get_realm_users(),
        query,
        current_stream,
        current_topic,
    );
    return result.map((person) => person.email);
}

test("sort_recipients", () => {
    const dev_sub = stream_data.get_sub("Dev");
    const linux_sub = stream_data.get_sub("Linux");

    // Typeahead for recipientbox [query, "", undefined]
    assert.deepEqual(get_typeahead_result("b", ""), [
        "b_user_1@zulip.net",
        "b_user_2@zulip.net",
        "b_user_3@zulip.net",
        "b_bot@example.com",
        "a_user@zulip.org",
        "zman@test.net",
        "a_bot@zulip.com",
    ]);

    // Typeahead for private message [query, "", ""]
    assert.deepEqual(get_typeahead_result("a", "", ""), [
        "a_user@zulip.org",
        "a_bot@zulip.com",
        "b_user_1@zulip.net",
        "b_user_2@zulip.net",
        "b_user_3@zulip.net",
        "zman@test.net",
        "b_bot@example.com",
    ]);

    const subscriber_email_1 = "b_user_2@zulip.net";
    const subscriber_email_2 = "b_user_3@zulip.net";
    const subscriber_email_3 = "b_bot@example.com";
    peer_data.add_subscriber(1, people.get_user_id(subscriber_email_1));
    peer_data.add_subscriber(1, people.get_user_id(subscriber_email_2));
    peer_data.add_subscriber(1, people.get_user_id(subscriber_email_3));

    stream_data.update_calculated_fields(dev_sub);
    stream_data.update_calculated_fields(linux_sub);

    // For splitting based on whether a PM was sent
    pm_conversations.set_partner(5);
    pm_conversations.set_partner(6);
    pm_conversations.set_partner(2);
    pm_conversations.set_partner(7);

    // For splitting based on recency
    recent_senders.process_message_for_senders({
        sender_id: 7,
        stream_id: 1,
        topic: "Dev Topic",
        id: (next_id += 1),
    });
    recent_senders.process_message_for_senders({
        sender_id: 5,
        stream_id: 1,
        topic: "Dev Topic",
        id: (next_id += 1),
    });
    recent_senders.process_message_for_senders({
        sender_id: 6,
        stream_id: 1,
        topic: "Dev Topic",
        id: (next_id += 1),
    });

    // Typeahead for stream message [query, stream-name, topic-name]
    assert.deepEqual(get_typeahead_result("b", "Dev", "Dev Topic"), [
        subscriber_email_3,
        subscriber_email_2,
        subscriber_email_1,
        "b_user_1@zulip.net",
        "zman@test.net",
        "a_user@zulip.org",
        "a_bot@zulip.com",
    ]);

    recent_senders.process_message_for_senders({
        sender_id: 5,
        stream_id: 2,
        topic: "Linux Topic",
        id: (next_id += 1),
    });
    recent_senders.process_message_for_senders({
        sender_id: 7,
        stream_id: 2,
        topic: "Linux Topic",
        id: (next_id += 1),
    });

    // No match
    assert.deepEqual(get_typeahead_result("h", "Linux", "Linux Topic"), [
        "zman@test.net",
        "b_user_3@zulip.net",
        "a_user@zulip.org",
        "b_bot@example.com",
        "a_bot@zulip.com",
        "b_user_1@zulip.net",
        "b_user_2@zulip.net",
    ]);
});

test("sort_recipients all mention", () => {
    const all_obj = ct.broadcast_mentions()[0];
    assert.equal(all_obj.email, "all");
    assert.equal(all_obj.is_broadcast, true);
    assert.equal(all_obj.idx, 0);

    // Test person email is "all" or "everyone"
    const test_objs = matches.concat([all_obj]);

    const results = th.sort_recipients(test_objs, "a", "Linux", "Linux Topic");

    assertSameEmails(results, [all_obj, a_bot, a_user, b_user_1, b_user_2, b_user_3, b_bot, zman]);
});

test("sort_recipients pm counts", () => {
    // Test sort_recipients with pm counts
    people.set_recipient_count_for_testing(a_bot.user_id, 50);
    people.set_recipient_count_for_testing(a_user.user_id, 2);
    people.set_recipient_count_for_testing(b_user_1.user_id, 32);
    people.set_recipient_count_for_testing(b_user_2.user_id, 42);
    people.set_recipient_count_for_testing(b_user_3.user_id, 0);
    people.set_recipient_count_for_testing(b_bot.user_id, 1);

    assert.deepEqual(get_typeahead_result("b"), [
        "b_user_2@zulip.net",
        "b_user_1@zulip.net",
        "b_bot@example.com",
        "b_user_3@zulip.net",
        "a_bot@zulip.com",
        "a_user@zulip.org",
        "zman@test.net",
    ]);

    // Now prioritize stream membership over pm counts.
    const linux_sub = stream_data.get_sub("Linux");
    peer_data.add_subscriber(linux_sub.stream_id, b_user_3.user_id);

    assert.deepEqual(get_typeahead_result("b", "Linux", "Linux Topic"), [
        "b_user_3@zulip.net",
        "b_user_1@zulip.net",
        "b_user_2@zulip.net",
        "b_bot@example.com",
        "a_bot@zulip.com",
        "a_user@zulip.org",
        "zman@test.net",
    ]);

    function compare() {
        throw new Error("We do not expect to need a tiebreaker here.");
    }

    // get some line coverage
    assert.equal(
        th.compare_people_for_relevance(b_user_1, b_user_3, compare, linux_sub.stream_id),
        1,
    );
    assert.equal(
        th.compare_people_for_relevance(b_user_3, b_user_1, compare, linux_sub.stream_id),
        -1,
    );
});

test("sort_recipients dup bots", () => {
    const dup_objects = matches.concat([a_bot]);

    const recipients = th.sort_recipients(dup_objects, "b", "", "");
    const recipients_email = recipients.map((person) => person.email);
    const expected = [
        "b_user_1@zulip.net",
        "b_user_2@zulip.net",
        "b_user_3@zulip.net",
        "b_bot@example.com",
        "a_user@zulip.org",
        "zman@test.net",
        "a_bot@zulip.com",
        "a_bot@zulip.com",
    ];
    assert.deepEqual(recipients_email, expected);
});

test("sort_recipients dup alls", () => {
    const all_obj = ct.broadcast_mentions()[0];

    // full_name starts with same character but emails are 'all'
    const test_objs = [all_obj, a_user, all_obj];

    const recipients = th.sort_recipients(test_objs, "a", "Linux", "Linux Topic");

    const expected = [all_obj, all_obj, a_user];
    assertSameEmails(recipients, expected);
});

test("sort_recipients subscribers", () => {
    // b_user_2 is a subscriber and b_user_1 is not.
    const small_matches = [b_user_2, b_user_1];
    const recipients = th.sort_recipients(small_matches, "b", "Dev", "Dev Topic");
    const recipients_email = recipients.map((person) => person.email);
    const expected = ["b_user_2@zulip.net", "b_user_1@zulip.net"];
    assert.deepEqual(recipients_email, expected);
});

test("sort_recipients pm partners", () => {
    // b_user_3 is a pm partner and b_user_2 is not and
    // both are not subscribered to the stream Linux.
    const small_matches = [b_user_3, b_user_2];
    const recipients = th.sort_recipients(small_matches, "b", "Linux", "Linux Topic");
    const recipients_email = recipients.map((person) => person.email);
    const expected = ["b_user_3@zulip.net", "b_user_2@zulip.net"];
    assert.deepEqual(recipients_email, expected);
});

test("sort broadcast mentions", () => {
    // test the normal case, which is that the
    // broadcast mentions are already sorted (we
    // actually had a bug where the sort would
    // randomly rearrange them)
    const results = th.sort_people_for_relevance(ct.broadcast_mentions().reverse(), "", "");

    assert.deepEqual(
        results.map((r) => r.email),
        ["all", "everyone", "stream"],
    );

    // Reverse the list to test actual sorting
    // and ensure test coverage for the defensive
    // code.  Also, add in some people users.
    const test_objs = Array.from(ct.broadcast_mentions()).reverse();
    test_objs.unshift(zman);
    test_objs.push(a_user);

    const results2 = th.sort_people_for_relevance(test_objs, "", "");

    assert.deepEqual(
        results2.map((r) => r.email),
        ["all", "everyone", "stream", a_user.email, zman.email],
    );
});

test("test compare directly", () => {
    // This is important for ensuring test coverage.
    // We don't technically need it now, but our test
    // coverage is subject to the whims of how JS sorts.
    const all_obj = ct.broadcast_mentions()[0];

    assert.equal(th.compare_people_for_relevance(all_obj, all_obj), 0);
    assert.equal(th.compare_people_for_relevance(all_obj, zman), -1);
    assert.equal(th.compare_people_for_relevance(zman, all_obj), 1);
});

test("highlight_with_escaping", () => {
    function highlight(query, item) {
        const regex = th.build_highlight_regex(query);
        return th.highlight_with_escaping_and_regex(regex, item);
    }

    let item = "Denmark";
    let query = "Den";
    let expected = "<strong>Den</strong>mark";
    let result = highlight(query, item);
    assert.equal(result, expected);

    item = "w3IrD_naMe";
    query = "w3IrD_naMe";
    expected = "<strong>w3IrD_naMe</strong>";
    result = highlight(query, item);
    assert.equal(result, expected);

    item = "development help";
    query = "development h";
    expected = "<strong>development h</strong>elp";
    result = highlight(query, item);
    assert.equal(result, expected);
});

test("render_person when emails hidden", () => {
    // Test render_person with regular person, under hidden email visibility case
    let rendered = false;
    stub_templates((template_name, args) => {
        assert.equal(template_name, "typeahead_list_item");
        assert.equal(args.primary, b_user_1.full_name);
        assert.equal(args.secondary, undefined);
        rendered = true;
        return "typeahead-item-stub";
    });
    assert.equal(th.render_person(b_user_1), "typeahead-item-stub");
    assert(rendered);
});

test("render_person", () => {
    // Test render_person with regular person
    page_params.is_admin = true;
    let rendered = false;
    stub_templates((template_name, args) => {
        assert.equal(template_name, "typeahead_list_item");
        assert.equal(args.primary, a_user.full_name);
        assert.equal(args.secondary, a_user.email);
        rendered = true;
        return "typeahead-item-stub";
    });
    assert.equal(th.render_person(a_user), "typeahead-item-stub");
    assert(rendered);
});

test("render_person special_item_text", () => {
    let rendered = false;

    // Test render_person with special_item_text person
    const special_person = {
        email: "special@example.com",
        full_name: "Special person",
        is_admin: false,
        is_bot: false,
        user_id: 7,
        special_item_text: "special_text",
    };

    rendered = false;
    stub_templates((template_name, args) => {
        assert.equal(template_name, "typeahead_list_item");
        assert.equal(args.primary, special_person.special_item_text);
        rendered = true;
        return "typeahead-item-stub";
    });
    assert.equal(th.render_person(special_person), "typeahead-item-stub");
    assert(rendered);
});

test("render_stream", () => {
    // Test render_stream with short description
    let rendered = false;
    const stream = {
        description: "This is a short description.",
        stream_id: 42,
        name: "Short Description",
    };

    stub_templates((template_name, args) => {
        assert.equal(template_name, "typeahead_list_item");
        assert.equal(args.primary, stream.name);
        assert.equal(args.secondary, stream.description);
        rendered = true;
        return "typeahead-item-stub";
    });
    assert.equal(th.render_stream(stream), "typeahead-item-stub");
    assert(rendered);
});

test("render_stream w/long description", () => {
    // Test render_stream with long description
    let rendered = false;
    const stream = {
        description: "This is a very very very very very long description.",
        stream_id: 43,
        name: "Long Description",
    };

    stub_templates((template_name, args) => {
        assert.equal(template_name, "typeahead_list_item");
        assert.equal(args.primary, stream.name);
        const short_desc = stream.description.slice(0, 35);
        assert.equal(args.secondary, short_desc + "...");
        rendered = true;
        return "typeahead-item-stub";
    });
    assert.equal(th.render_stream(stream), "typeahead-item-stub");
    assert(rendered);
});

test("render_emoji", () => {
    // Test render_emoji with normal emoji.
    let rendered = false;
    let test_emoji = {
        emoji_name: "thumbs_up",
        emoji_code: "1f44d",
    };
    emoji.active_realm_emojis = new Map(
        Object.entries({
            realm_emoji: "TBD",
        }),
    );

    stub_templates((template_name, args) => {
        assert.equal(template_name, "typeahead_list_item");
        assert.deepEqual(args, {
            primary: "thumbs up",
            emoji_code: "1f44d",
            is_emoji: true,
            has_image: false,
            has_secondary: false,
        });
        rendered = true;
        return "typeahead-item-stub";
    });
    assert.equal(th.render_emoji(test_emoji), "typeahead-item-stub");
    assert(rendered);

    // Test render_emoji with normal emoji.
    rendered = false;
    test_emoji = {
        emoji_name: "realm_emoji",
        emoji_url: "TBD",
    };

    stub_templates((template_name, args) => {
        assert.equal(template_name, "typeahead_list_item");
        assert.deepEqual(args, {
            primary: "realm emoji",
            img_src: "TBD",
            is_emoji: true,
            has_image: true,
            has_secondary: false,
        });
        rendered = true;
        return "typeahead-item-stub";
    });
    assert.equal(th.render_emoji(test_emoji), "typeahead-item-stub");
    assert(rendered);
});

test("sort_slash_commands", () => {
    const slash_commands = [
        {name: "my"},
        {name: "poll"},
        {name: "me"},
        {name: "mine"},
        {name: "test"},
        {name: "ping"},
    ];
    assert.deepEqual(th.sort_slash_commands(slash_commands, "m"), [
        {name: "me"},
        {name: "mine"},
        {name: "my"},
        {name: "ping"},
        {name: "poll"},
        {name: "test"},
    ]);
});

test("sort_recipientbox_typeahead", () => {
    let recipients = th.sort_recipientbox_typeahead("b, a", matches, ""); // search "a"
    let recipients_email = recipients.map((person) => person.email);
    assert.deepEqual(recipients_email, [
        "a_user@zulip.org", // matches "a"
        "a_bot@zulip.com", // matches "a"
        "b_user_1@zulip.net",
        "b_user_2@zulip.net",
        "b_user_3@zulip.net",
        "zman@test.net",
        "b_bot@example.com",
    ]);

    recipients = th.sort_recipientbox_typeahead("b, a, b", matches, ""); // search "b"
    recipients_email = recipients.map((person) => person.email);
    assert.deepEqual(recipients_email, [
        "b_user_1@zulip.net",
        "b_user_2@zulip.net",
        "b_user_3@zulip.net",
        "b_bot@example.com",
        "a_user@zulip.org",
        "zman@test.net",
        "a_bot@zulip.com",
    ]);
});
