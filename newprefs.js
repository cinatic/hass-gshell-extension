const {Gio, Gtk, GObject, Secret} = imports.gi;

const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Settings = Me.imports.settings;
const _  = Settings._;

// const Convenience = Me.imports.utils;
const Convenience = imports.misc.extensionUtils;

const HASS_ACCESS_TOKEN = 'hass-access-token';
const HASS_URL = 'hass-url';
const HASS_TOGGLABLE_ENTITIES = 'hass-togglable-entities';
const HASS_ENABLED_ENTITIES = 'hass-enabled-entities';
// const HASS_SHORTCUT = 'hass-shortcut';
const SHOW_NOTIFICATIONS_KEY = 'show-notifications';
const SHOW_WEATHER_STATS = 'show-weather-stats';
const SHOW_HUMIDITY = 'show-humidity';
const TEMPERATURE_ID = 'temp-entity-id';
const HUMIDITY_ID = 'humidity-entity-id';
const DO_REFRESH = 'refresh-weather';
const REFRESH_RATE = 'weather-refresh-seconds';
const HASS_SETTINGS = 'org.gnome.shell.extensions.hass-data';

let notebook;
let schema;
let _settings = Convenience.getSettings(HASS_SETTINGS);
// _settings.connect('changed', _refresh.bind(this)); // TODO: Refresh

function init() {
    schema = _settings.settings_schema;
    log(`initializing ${Me.metadata.name} Preferences`);
}

function buildPrefsWidget() {
    const prefsWidget = new Gtk.Grid();
    notebook = new Gtk.Notebook({
        tab_pos: Gtk.PositionType.LEFT,
        hexpand: true
    });
    
    prefsWidget.attach(notebook, 0, 0, 1, 1);

    let general_settings = new Gtk.Label({ label: _('General Settings'), halign: Gtk.Align.START});
    notebook.append_page(_buildGeneralSettings(), general_settings);

    let togglables = new Gtk.Label({ label: _('Togglables'), halign: Gtk.Align.START});
    // TODO
    // notebook.append_page(_buildTogglables(), togglables);
    notebook.append_page(_buildTogglableSettings(), togglables);

    return prefsWidget;
}

function _buildGeneralSettings() {
    const mscOptions = new Settings.MscOptions();

    let miscUI = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing:       10,
        homogeneous: false,
        margin_start:  12,
        margin_end:    12,
        margin_top:    12,
        margin_bottom: 12
    });

    let optionsList = [];

    // //////////////////////////////////////////////////////////
    // ////////////// Starting the Global Options ///////////////
    // //////////////////////////////////////////////////////////
    optionsList.push(
        _optionsItem(
            _makeTitle(_('Global options:')),
            null,
            null,
            null
        )
    );
    // Add the HASS url option
    let [urlItem, urlTextEntry, urlAddButton] = _makeGtkEntryButton(HASS_URL)
    optionsList.push(urlItem);
    // Add the HASS Access Token option
    let [tokItem, tokenTextEntry, tokenAddButton] = _makeGtkEntryButton(HASS_ACCESS_TOKEN, true)
    optionsList.push(tokItem);

    // //////////////////////////////////////////////////////////
    // //////// Starting the Temperature/Humidity options ///////
    // //////////////////////////////////////////////////////////
    optionsList.push(
        _optionsItem(
            _makeTitle(_('Temperature/Humidity options:')),
            null,
            null,
            null
        )
    );
    // Show Temperature/Humidity Switch
    let [tempItem, tempHumiSwitch] = _makeSwitch(SHOW_WEATHER_STATS)
    optionsList.push(tempItem);
    // Show Humidity Switch
    let [humiItem, humiSwitch] = _makeSwitch(SHOW_HUMIDITY)
    optionsList.push(humiItem);
    // Refresh Temperature/Humidity Switch (TODO: Does not work currently)
    let [doRefItem, doRefreshSwitch] = _makeSwitch(DO_REFRESH)
    optionsList.push(doRefItem);
    // Refresh rate for Temperature/Humidity (TODO: Does not work currently)
    let [refRateItem, refreshRateTextEntry, refreshRateAddButton] = _makeGtkEntryButton(REFRESH_RATE)
    optionsList.push(refRateItem);
    // Add the temperature id option
    let [tempTextItem, tempTextEntry, tempAddButton] = _makeGtkEntryButton(TEMPERATURE_ID)
    optionsList.push(tempTextItem);
    // Add the humidity id option
    let [humiTextItem, humiTextEntry, humiAddButton] = _makeGtkEntryButton(HUMIDITY_ID)
    optionsList.push(humiTextItem);


    // //////////////////////////////////////////////////////////
    // ////////////////// Building the boxes ////////////////////
    // //////////////////////////////////////////////////////////
    let frame;
    let frameBox;
    let canFocus;
    for (let item of optionsList) {
        if (!item[0][1]) {
            let lbl = new Gtk.Label();
            lbl.set_markup(item[0][0]);
            frame = new Gtk.Frame({
                label_widget: lbl
            });
            frameBox = new Gtk.ListBox({
                selection_mode: null,
                can_focus: true,
            });
            miscUI.append(frame);
            frame.set_child(frameBox);
            continue;
        }
        canFocus = !item[0][2] ? false : true;
        let box = new Gtk.Box({
            can_focus: canFocus,
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_start: 4,
            margin_end:   4,
            margin_top:   4,
            margin_bottom:4,
            hexpand: true,
            spacing: 30,
        });
        for (let i of item[0]) {
            box.append(i)
        }
        if (item.length === 2) {
            box.set_tooltip_text(item[1]);
        }
        frameBox.append(box);
    }

    // //////////////////////////////////////////////////////////
    // //////////////// Handlers for Switches ///////////////////
    // //////////////////////////////////////////////////////////
    tempHumiSwitch.active = mscOptions.tempHumi;
    tempHumiSwitch.connect('notify::active', () => {
        mscOptions.tempHumi = tempHumiSwitch.active;
    });
    humiSwitch.active = mscOptions.showHumidity;
    humiSwitch.connect('notify::active', () => {
        mscOptions.showHumidity = humiSwitch.active;
    });
    doRefreshSwitch.active = mscOptions.doRefresh;
    doRefreshSwitch.connect('notify::active', () => {
        mscOptions.doRefresh = doRefreshSwitch.active;
    });

    // //////////////////////////////////////////////////////////
    // /////////////// Handlers for the Buttons /////////////////
    // //////////////////////////////////////////////////////////
    // urlAddButton.clicked = mscOptions.hassUrl;
    urlTextEntry.set_text(mscOptions.hassUrl);
    urlAddButton.connect('clicked', () => {
        mscOptions.hassUrl = urlTextEntry.get_text();
    });

    refreshRateTextEntry.set_text(mscOptions.refreshRate);
    refreshRateAddButton.connect('clicked', () => {
        mscOptions.refreshRate = refreshRateTextEntry.get_text();
    });

    tempTextEntry.set_text(mscOptions.temperatureId);
    tempAddButton.connect('clicked', () => {
        mscOptions.temperatureId = tempTextEntry.get_text();
    });

    humiTextEntry.set_text(mscOptions.humidityId);
    humiAddButton.connect('clicked', () => {
        mscOptions.humidityId = humiTextEntry.get_text();
    });

    return miscUI;
}

function _buildTogglableSettings() {
    const mscOptions = new Settings.MscOptions();

    let miscUI = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing:       10,
        homogeneous: false,
        margin_start:  12,
        margin_end:    12,
        margin_top:    12,
        margin_bottom: 12
    });
    let optionsList = [];

    // //////////////////////////////////////////////////////////
    // /////////// Which switches should be togglable ///////////
    // //////////////////////////////////////////////////////////
    let togglables = mscOptions.togglableEntities;
    let enabledEntities = mscOptions.enabledEntities;
    if (togglables.length === 0) {
        optionsList.push(_optionsItem(
            _makeTitle(_('Togglable Entities:')), null, null, null
        ));
    } else {
        // Only the title changes
        optionsList.push(_optionsItem(
            _makeTitle(_('Choose Togglable Entities:')), null, null, null
        ));
    }

    // Add the HASS url option
    let togglableCheckBoxes = [];
    for (let tog of togglables) {
        let checked = false;
        if (enabledEntities.includes(tog)) checked = true;
        let [togglableItem, togglableCheckBox] = _makeCheckBox(tog, checked);
        optionsList.push(togglableItem);
        togglableCheckBoxes.push({
            entity: tog,
            cb: togglableCheckBox, 
            checked: checked
        });
    }

    // //////////////////////////////////////////////////////////
    // /// Grouping multiple switches into a single togglable ///
    // //////////////////////////////////////////////////////////
    optionsList.push(
        _optionsItem(
            _makeTitle(_('Group Switches')),
            null,
            null,
            null
        )
    );
    optionsList.push(_optionsItem(
        "Experimental",
        "Does not currently work.",
        new Gtk.Label(),
        null
    ));

    // //////////////////////////////////////////////////////////
    // ////////////////// Building the boxes ////////////////////
    // //////////////////////////////////////////////////////////
    let frame;
    let frameBox;
    for (let item_id in optionsList) {
        let item = optionsList[item_id];
        if (!item[0][1]) {
            let lbl = new Gtk.Label();
            lbl.set_markup(item[0][0]);
            frame = new Gtk.Frame({
                label_widget: lbl
            });
            frameBox = new Gtk.ListBox({
                selection_mode: null,
                can_focus: false,
            });
            miscUI.append(frame);
            frame.set_child(frameBox);
            continue;
        }
        let box = new Gtk.Box({
            can_focus: false,
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_start: 4,
            margin_end:   4,
            margin_top:   4,
            margin_bottom:4,
            hexpand: true,
            spacing: 30,
        });
        for (let i of item[0]) {
            box.append(i)
        }
        if (item.length === 2) {
            box.set_tooltip_text(item[1]);
        }
        frameBox.append(box);
    }

    // //////////////////////////////////////////////////////////
    // /////////////// Handlers for Checkboxes //////////////////
    // //////////////////////////////////////////////////////////
    for (let togCheckBox of togglableCheckBoxes) {
        togCheckBox.cb.set_active(togCheckBox.checked)
        togCheckBox.cb.connect('notify::active', () => {
            let currentEntities = mscOptions.enabledEntities;
            let index = currentEntities.indexOf(togCheckBox.entity);
            if (index > -1) { // then it exists and so we pop
                currentEntities.splice(index, 1)
            } else {
                currentEntities.push(togCheckBox.entity)
            }
            // (TODO)
            // The problem here is that by checking a checkbox the menu entries 
            // will not change and another setting must be changed for that to happend.
            // I don't really know why. Something we how setting changes are binded.
            mscOptions.enabledEntities = currentEntities;
        });
    }

    return miscUI;
}

function _optionsItem(text, tooltip, widget, button) {
    let item = [[],];
    let label;
    if (widget) {
        label = new Gtk.Label({
            halign: Gtk.Align.START
        });
        label.set_markup(text);
    } else {
        label = text;
    }
    item[0].push(label);
    if (widget) 
        item[0].push(widget);
    if (tooltip) 
        item.push(tooltip);
    if (button)
        item[0].push(button)

    return item;
}

function _makeTitle(label) {
    return '<b>'+label+'</b>';
}

function _makeGtkEntryButton(name, isAccessToken) {
    let key = schema.get_key(name);
    let [textEntry, addButton] = _newGtkEntryButton();
    if (isAccessToken === true) {
        addButton.connect('clicked', () => {
            if (textEntry.get_text().trim() !== "") {
                // Synchronously (the UI will block): https://developer.gnome.org/libsecret/unstable/js-store-example.html
                Secret.password_store_sync(
                    Utils.TOKEN_SCHEMA, 
                    {"token_string": "user_token"}, 
                    Secret.COLLECTION_DEFAULT,
                    "long_live_access_token", 
                    textEntry.get_text(), 
                    null
                );
                textEntry.set_text("Success!");
            } else {
                textEntry.set_text("Invalid Token!");
            }
        });
    } 
    // else {
    //     addButton.connect('clicked', () => {
    //         _settings.set_string(name, textEntry.get_text())
    //     });
    // }
    return [
        _optionsItem(
            _(key.get_summary()),
            _(key.get_description()),
            textEntry,
            addButton
        ),
        textEntry,
        addButton
    ]
}

function _makeSwitch(name) {
    let key = schema.get_key(name);
    let gtkSwitch = _newGtkSwitch();
    return [
        _optionsItem(
            key.get_summary(),
            key.get_description(),
            gtkSwitch,
            null
        ),
        gtkSwitch
    ]
}

function _makeCheckBox(name, checked) {
    let gtkCheckBox = _newGtkCheckBox(checked);
    return [
        _optionsItem(
            name,
            _("Do you want to show ") + name + _(" in the tray menu?"),
            gtkCheckBox,
            null
        ),
        gtkCheckBox
    ]
}

function _newGtkCheckBox(checked) {
    let cb = new Gtk.CheckButton({
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
        hexpand: true
    });
    if (checked === true) {
        cb.set_active(true)
    }
    return cb
}

function _newGtkSwitch() {
    return new Gtk.Switch({
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
        hexpand: true
    });
}

function _newGtkEntryButton() {
    let textEntry = new Gtk.Entry({
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER,
        hexpand: true,
        text: ""
    });

    let addButton = new Gtk.Button({
        halign: Gtk.Align.END,
        valign: Gtk.Align.CENTER, 
        label: "Add",
        hexpand: true
    });
    return [textEntry, addButton]
}
