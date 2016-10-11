
const remote = require('electron').remote;

const {Menu, MenuItem} = remote

/////// right click menu ////////////
const menu = new Menu()

const menuItem = new MenuItem({
  label: 'remove folder',
  click: () => {
      removeFolder();  // remove folder on clicking on remove folder

  }
})
menu.append(menuItem)
/////////////// end of right click menu .////////////

/////////// settings menu ///////////////////
const settingsMenu = new Menu();
const settingsMenuItem = new MenuItem({
    label: 'Add Group',
    click: () => {
        var newWindow = require('electron').remote.require('./main').newWindow;
        var win = newWindow(null);

    }
})

settingsMenu.append(settingsMenuItem);
