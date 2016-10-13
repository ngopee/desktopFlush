
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

// since we can't change labels dynamically, I have 2 menus, one with reduce and the other with expand
// on the clicking on reduce i move to the expand one and vice versa


const settings1 = new Menu(); // the one with reduce
const settings2 = new Menu();  // the one with expand

var settingsMenu = settings1;  // the menu to be shown

const AddGroupItem = new MenuItem({
    label: 'Add Group',
    click: () => {
        var newWindow = require('electron').remote.require('./main').newWindow;
        var win = newWindow(null);

    }
})


var reduce = new MenuItem({
    label: 'Reduce',
    click: () => {
        document.getElementById("box").style.display = "none";
        settingsMenu = settings2;
    }
})

var expand = new MenuItem({
    label: 'Expand',
    click: () => {
        document.getElementById("box").style.display = "block";
        settingsMenu = settings1;

    }
})

settings1.append(AddGroupItem);
settings1.append(reduce);

settings2.append(AddGroupItem);
settings2.append(expand);
