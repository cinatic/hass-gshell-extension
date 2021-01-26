const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Convenience = Me.imports.utils;

const HASS_ACCESS_TOKEN = 'hass-access-token';
const HASS_URL = 'hass-url';
const HASS_TOGGLABLE_ENTITIES = 'hass-togglable-entities';
// const HASS_SHORTCUT = 'hass-shortcut';
const SHOW_NOTIFICATIONS_KEY = 'show-notifications';
const SHOW_WEATHER_STATS = 'show-weather-stats';
const SHOW_HUMIDITY = 'show-humidity';
const TEMPERATURE_ID = 'temp-entity-id';
const HUMIDITY_ID = 'humidity-entity-id';
const DO_REFRESH = 'refresh-weather';
const REFRESH_RATE = 'weather-refresh-seconds';

const Columns = {
  APPINFO: 0,
  DISPLAY_NAME: 1,
  ICON: 2
};

// let ShellVersion = parseInt(Config.PACKAGE_VERSION.split(".")[1]);

// Taken from the Caffeine extension:
//  https://github.com/eonpatapon/gnome-shell-extension-caffeine/blob/master/caffeine%40patapon.info/prefs.js
class HassWidget {
  constructor(params) {
      this.w = new Gtk.Grid(params);
      this.w.set_orientation(Gtk.Orientation.VERTICAL);

      this._settings = Convenience.getSettings();
      this._settings.connect('changed', this._refresh.bind(this));
      this._changedPermitted = false;


      this.w.add(this.make_row_switch(SHOW_WEATHER_STATS));
      this.w.add(this.make_row_switch(SHOW_HUMIDITY));
      this.w.add(this.make_row_switch(DO_REFRESH));
      this.w.add(this.make_text_row(REFRESH_RATE, true));

      /*  =========================================
          ======== HASS PROFILE SPECIFICS =========
          =========================================
      */

      this.w.add(this.make_text_row(TEMPERATURE_ID));
      this.w.add(this.make_text_row(HUMIDITY_ID));

      this.w.add(this.make_text_row(HASS_ACCESS_TOKEN))
      this.w.add(this.make_text_row(HASS_URL))


      /*  =========================================
          ======= ENABLE NOTIFICATION AREA ========
          =========================================
      */

      // const notificationsBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
      //                         margin: 7});

      // const notificationsLabel = new Gtk.Label({label: "Enable notifications",
      //                            xalign: 0});

      // const notificationsSwitch = new Gtk.Switch({active: this._settings.get_boolean(SHOW_WEATHER_STATS)});
      // notificationsSwitch.connect('notify::active', button => {
      //     this._settings.set_boolean(SHOW_WEATHER_STATS, button.active);
      // });

      // notificationsBox.pack_start(notificationsLabel, true, true, 0);
      // notificationsBox.add(notificationsSwitch);

      // this.w.add(notificationsBox);

      /*  =========================================
          ========= ADD APPLICATION AREA ==========
          =========================================
      */

      this._store = new Gtk.ListStore();
      this._store.set_column_types([GObject.TYPE_STRING]);


      let addNewEntityBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin: 7});

      let addNewEntityLabel = new Gtk.Label({label: "New Entity ID:", xalign: 0});

      let addNewEntityEntry = new Gtk.Entry();
      let addNewEntityButton = new Gtk.Button({ label: "Add Entity ID"});
      addNewEntityButton.connect('clicked', () => {
        this._createNew(addNewEntityEntry.get_text())
      });

      addNewEntityBox.pack_start(addNewEntityLabel, true, true, 6);
      addNewEntityBox.add(addNewEntityEntry);
      addNewEntityBox.add(addNewEntityButton);

      this.w.add(addNewEntityBox);

      //

      this._treeView = new Gtk.TreeView({ model: this._store,
                                          hexpand: true, vexpand: true });
      this._treeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

      const entityColumn = new Gtk.TreeViewColumn({ expand: true, sort_column_id: Columns.DISPLAY_NAME,
                                               title: "Home Assistant Entity Ids that can be toggled:" });
      const idRenderer = new Gtk.CellRendererText;
      entityColumn.pack_start(idRenderer, true);
      entityColumn.add_attribute(idRenderer, "text", 0);
      this._treeView.append_column(entityColumn);

      this.w.add(this._treeView);

      const toolbar = new Gtk.Toolbar();
      toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_INLINE_TOOLBAR);
      this.w.add(toolbar);

      const delButton = new Gtk.ToolButton({ stock_id: Gtk.STOCK_DELETE, label: "Delete Entity ID" });
      delButton.connect('clicked', this._deleteSelected.bind(this));
      toolbar.add(delButton);

      this._changedPermitted = true;
      this._refresh();
  }

  _createNew(entity_id) {

    this._changedPermitted = false;
    if (!this._appendItem(entity_id)) {
        this._changedPermitted = true;
        return;
    }
    let iter = this._store.append();

    this._store.set(iter,
                    [0],
                    [entity_id]);
    this._changedPermitted = true;
  }

  _deleteSelected() {
      const [any, , iter] = this._treeView.get_selection().get_selected();

      if (any) {
          const entityInfo = this._store.get_value(iter, 0);
          this._changedPermitted = false;
          this._removeItem(entityInfo);
          this._store.remove(iter);
          this._changedPermitted = true;
      }
  }

  _refresh() {
      if (!this._changedPermitted)
          // Ignore this notification, model is being modified outside
          return;

      this._store.clear();

      const currentItems = this._settings.get_strv(HASS_TOGGLABLE_ENTITIES);
      const validItems = [ ];
      for (let i = 0; i < currentItems.length; i++) {
          let item = currentItems[i];
          if (item === "")
            continue
          if (!item.includes(".")){
            item += " (INVALID)"
          }
          validItems.push(item);
          const iter = this._store.append();
          this._store.set(iter,
                          [0],
                          [item]);
      }

      if (validItems.length != currentItems.length) // some items were filtered out
          this._settings.set_strv(HASS_TOGGLABLE_ENTITIES, validItems);
  }

  _appendItem(entity_id) {
      const currentItems = this._settings.get_strv(HASS_TOGGLABLE_ENTITIES);

      if (currentItems.includes(entity_id)) {
          printerr("Already have an item for this entity_id.");
          return false;
      }

      if (!entity_id.includes(".")){
        entity_id += " (INVALID)"
      }
      currentItems.push(entity_id);
      this._settings.set_strv(HASS_TOGGLABLE_ENTITIES, currentItems);
      return true;
  }

  _removeItem(entity_id) {
      if (entity_id.includes(" (INVALID)")) {
        entity_id = entity_id.replace(" (INVALID)", "")
      }
      const currentItems = this._settings.get_strv(HASS_TOGGLABLE_ENTITIES);
      const index = currentItems.indexOf(entity_id);

      if (index < 0)
          return;

      currentItems.splice(index, 1);
      this._settings.set_strv(HASS_TOGGLABLE_ENTITIES, currentItems);
  }


  // Taken from the GameMode gnome-shell-extension: https://extensions.gnome.org/extension/1852/gamemode/
  make_row_switch(name) {
      let schema = this._settings.settings_schema;

      let row = new Gtk.ListBoxRow ();

      let hbox = new Gtk.Box({
          orientation: Gtk.Orientation.HORIZONTAL,
          margin: 7,
      });

      row.add(hbox);

      let vbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
      hbox.pack_start(vbox, true, true, 6);

      let sw = new Gtk.Switch({valign: Gtk.Align.CENTER});

      hbox.pack_start(sw, false, false, 0);

      let key = schema.get_key(name);

      let summary = new Gtk.Label({
          label: `<span size='medium'><b>${key.get_summary()}</b></span>`,
          hexpand: true,
          halign: Gtk.Align.START,
          use_markup: true
      });

      vbox.pack_start(summary, false, false, 0);

      let description = new Gtk.Label({
          label: `<span size='small'>${key.get_description()}</span>`,
          hexpand: true,
          halign: Gtk.Align.START,
          use_markup: true
      });
      description.get_style_context().add_class('dim-label');

      vbox.pack_start(description, false, false, 0);

      this._settings.bind(name, sw, 'active',
                          Gio.SettingsBindFlags.DEFAULT);
      return row;
  }

  make_text_row(name, sameRowText=false) {
    let schema = this._settings.settings_schema;

    let row = new Gtk.ListBoxRow();
    let hbox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, margin: 7});
    row.add(hbox);
    let vbox = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
    hbox.pack_start(vbox, true, true, 6);


    let addButton = new Gtk.Button({valign: Gtk.Align.CENTER, label: "Add"});
    addButton.connect('clicked', () => {
      this._settings.set_string(name, textEntry.get_text())
    });

    let key = schema.get_key(name);
    let summary = new Gtk.Label({label: `<span size='medium'><b>${key.get_summary()}</b></span>`, hexpand: true, 
                                 halign: Gtk.Align.START, use_markup: true})
    vbox.pack_start(summary, false, false, 0);
    let description = new Gtk.Label({
        label: `<span size='small'>${key.get_description()}</span>`,
        hexpand: true,
        halign: Gtk.Align.START,
        use_markup: true
    });
    description.get_style_context().add_class('dim-label');
    vbox.add(description);

    let default_val = key.get_default_value().get_string()[0];
    if (default_val === "") {
      default_val = this._settings.get_string(name)
    }

    let textEntry = new Gtk.Entry({margin: 7, text: default_val});
    if (sameRowText){
      hbox.add(textEntry);
      hbox.add(addButton);
    } else {
      hbox.add(addButton);
      vbox.add(textEntry);
    }
    

    return row;

  }
}


function init() {
  
}

function buildPrefsWidget() {
  const widget = new HassWidget();
  widget.w.show_all();

  return widget.w;
}