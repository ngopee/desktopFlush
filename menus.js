
const remote = require('electron').remote;


const {Menu, MenuItem} = remote

/////// right click menu ////////////
const menu = new Menu()

const menuItem = new MenuItem({
  label: 'remove folder',
  click: () => {
      removeFolder(null);  // remove folder on clicking on remove folder

  }
})
menu.append(menuItem)
/////////////// end of right click menu .////////////



/////////// settings menu ///////////////////


const settingsMenu = new Menu(); // the settings Menu

const AddGroupItem = new MenuItem({
    label: 'Add Group',
    click: () => {
        var newWindow = require('electron').remote.require('./main').newWindow;
        var win = newWindow(null);

    }
})

const colors = new MenuItem({
    label: "Window Color",
    submenu: [
        {
            label: "\u{1F534}" + "Red",
            click: () => {
                document.getElementById("box").style.backgroundColor = "rgba(232, 22, 22, 0.75)";
            }
        },
        {
            label: "Gray",
            icon: "icons/gray.png",
            click: () => {
                document.getElementById("box").style.backgroundColor = "rgba(100,100,100,0.75)";
            }
        },
        {
            label: "\u{1F535}" + "Blue",
            click: () => {
                document.getElementById("box").style.backgroundColor = "rgba(22,22,232,0.75)";
            }
        },
    ]
})


const remove_group = new MenuItem({
    label: 'Delete Group',
    click: () => {
        removeGroup();
    }
})

settingsMenu.append(AddGroupItem);
settingsMenu.append(remove_group);
settingsMenu.append(colors);
