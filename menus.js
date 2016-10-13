
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

var reduced = false;

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


var reduceFoldersItem = new MenuItem({
    label: 'Reduce',
    click: () => {

        var folders = document.getElementsByClassName('folderButton');
        var l = folders.length

        for (var i = 0; i < l; i++){
            folders[0].className = "folderButtonReduce";
        }

        var names = document.getElementsByClassName('fileNameElement');
        l = names.length;
        for (var i = 0; i < l; i++){
            names[0].className = "fileNameElementReduce";
        }

        settingsMenu = settings2;
        reduced = true;
    }
})

var expandFoldersItem = new MenuItem({
    label: 'Expand',
    click: () => {
        var folders = document.getElementsByClassName('folderButtonReduce');
        var l = folders.length;
        for (var i = 0; i < l; i++){
            folders[0].className = "folderButton";

        }

        var names = document.getElementsByClassName('fileNameElementReduce');
        l = names.length;
        for (var i = 0; i < l; i++){
            names[0].className = "fileNameElement";
        }
        settingsMenu = settings1;
        reduced = false;  

    }
})

settings1.append(AddGroupItem);
settings1.append(reduceFoldersItem);

settings2.append(AddGroupItem);
settings2.append(expandFoldersItem);
