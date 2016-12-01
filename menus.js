
const remote = require('electron').remote;


const {Menu, MenuItem} = remote

/////// right click menu ////////////
const menu = new Menu()

const menuItem = new MenuItem({
  label: 'remove',
  click: () => {
      removeFolder(null);  // remove folder on clicking on remove folder

  }
})
menu.append(menuItem)
/////////////// end of right click menu .////////////



/////////// settings menu ///////////////////


var settingsMenu = new Menu(); // the settings Menu

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

function createSettingsMenu(currentWindowTitle){
    if (currentWindowTitle == null){
        return;
    }

    settingsMenu = new Menu();
    var titles = remote.getGlobal("sharedObj").titles;
    folderSubMenu = [];
    for (var i = 0; i < titles.length ; i++){
        if (currentWindowTitle == titles[i]){
            continue;
        }
        var m = new MenuItem({
            label: titles[i],
            click: (m, b, e) => mergeToFolder(currentWindowTitle, m.label)
        });

        folderSubMenu.push(m)
    }
    var mergeMenu = new MenuItem({
        label: 'Merge to',
        submenu: folderSubMenu
    });
    settingsMenu.append(AddGroupItem);
    settingsMenu.append(remove_group);
    settingsMenu.append(colors);
    settingsMenu.append(mergeMenu);
}

createSettingsMenu();
