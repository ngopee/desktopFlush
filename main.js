const {app, BrowserWindow, Menu, MenuItem, ipcMain} = require('electron')
const fse = require("fs-extra");
const path = require("path");
const chokidar = require("chokidar");
const shell = require("electron").shell;

const appPath = `file://${__dirname}/`;
const desktopPath = app.getPath('desktop');

const MAIN_DIR = 'test';

const mainFolderPath = desktopPath + "/" + MAIN_DIR + "/";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
global.sharedObj = {windows: [], titles:[], appFolder: MAIN_DIR};

exports.newWindow = newWindow;
exports.getWindowIndex = getWindowIndex;


// app.setAboutPanelOptions({"applicationName": "Desktop Flush", "applicationVersion": '1.0.0', "credits":'John and Naassih'});

var isWindowed = true;

var renamedFolderTitle = "";
var vp = 0;

var justCreated = false;

var convertToDock = false;

var watcher;

// to add it to the top bar
// var menubar = require('menubar')
//
//
// var mb = menubar({'index': appPath + 'menubar/topmenu.html', 'width':400, 'height': 200});
//
// mb.on('ready', function ready () {
//    console.log("hello");
// })


// app.dock.hide(); // to hide it from the dock

var dockMenu = [];

function createMenuList(groupName, data){
    console.log(data);

    var menu = new Menu();

    var path = desktopPath + "/" + MAIN_DIR + "/" + groupName + "/";    // the new path (inside a folder on the desktop)

    for (var i = 0; i < data.length; i++){

        menu.append(new MenuItem({
            label: data[i],
            click: (item) => {
                var toOpen = path + item.label;
                shell.openItem(toOpen);
            }
        }));
    }

    return menu;
}

ipcMain.on("dockData", (event, data) => {
    var menu = new MenuItem(
        {
            label: data[0],
            submenu: createMenuList(data[0], data[1])
        });


    vp = vp - 1;
    dockMenu.push(menu);

    if (vp == 0){
        var mainDockMenu = Menu.buildFromTemplate([
            {
                label: 'DF',
                submenu: dockMenu
            }
        ])

        app.dock.setMenu(mainDockMenu);
    }

});


// the function return the number of groups based on the folders in the main folder
function getNumOfGroups(){
    var folders =  fse.readdirSync(mainFolderPath).filter(function(file) {
            return fse.statSync(path.join(mainFolderPath, file)).isDirectory();
        });

    return folders.length;
}

// return windowIndex by the window (called from renderer process)
function getWindowIndex(win){
    var windows = global.sharedObj.windows;
    for (var i = 0; i < windows.length; i ++){
        if (windows[i] == win){
            return i;
        }
    }
}


// returns the index of the folder in the list
// returns -1 on error
function getWindowIndexByName(folderName){
    var list = global.sharedObj.titles;
    for (var i = 0; i < list.length; i++){
        if (list[i] === folderName){
            return i;
        }
    }

    return -1;
}

function unWatchMain(){
    watcher.close();
}

function setWatcher(){
    var path = mainFolderPath;

     watcher = chokidar.watch(path, {
         ignored: /[\/\\]\./,
         ignoreInitial: true,
         persistent: true,
         depth: 0
     });

    //  // Declare the listeners of the watcher
     watcher
     .on('add', function(path) {
        console.log('File', path, 'has been added');
     })
     .on('addDir', function(path) {  //on adding a new dir
         console.log(path + " is added");
         if (justCreated == true){   // if it is added  from the beginning normally..don't re-add it using the watcher
             justCreated = false;
             return;
         }
         var fileName = path.split("/");
         fileName = fileName[fileName.length-1]; // get the name of the folder

         var numOfGroups = getNumOfGroups();

         if (numOfGroups == global.sharedObj.windows.length){
             // we are renaming a folder since the number of folders didn't change
             var index = getWindowIndexByName(renamedFolderTitle); // get the index of the window

             if (index == -1){ // if it wasn't found return
                 console.log("error");
                 return;
             }
              // set the title to the new title
             global.sharedObj.titles[index] = fileName;  //renaming of title

             // send to the window to change its title
             global.sharedObj.windows[index].webContents.send("changeTitle", {newTitle: fileName});

             return;
         }

         // if it isnot a renaming, then create a new window with the folderName as a title
         newWindow(fileName);
         console.log('Directory', path, 'has been added');
     })
     .on('change', function(path) {
          console.log('File', path, 'has been changed');
     })
     .on('unlink', function(path) { // on the deletion of a file
         // we dont care about the deletion of files in that directory
          console.log('File', path, 'has been removed');
     })
     .on('unlinkDir', function(path) { // on the deletion of a folder
         var dirName = path.split("/");
         dirName = dirName[dirName.length-1];  // get the folder name

         var numOfGroups = getNumOfGroups(); // get the number of groups

         // if number of folders changed then a folder has been deleted, otherwise it is a renaming
         if (numOfGroups != global.sharedObj.windows.length){
             console.log("close window");
             var index = getWindowIndexByName(dirName); // get the index of the window
             global.sharedObj.windows[index].close(); // close the window

             console.log(global.sharedObj.titles);

             global.sharedObj.windows.splice(index, 1); // delete the window from the list
             global.sharedObj.titles.splice(index, 1); // delete the title from the list

            console.log(global.sharedObj.titles);
             return;
         }

         // otherwise it is a renaming, save the name of the file that is being renamed to be able to
         // get it from the DOM when changing its name to the new name
         renamedFolderTitle = dirName;
         console.log("renaming");

          console.log('Directory', path, 'has been removed');
     })
     .on('error', function(error) {
          console.log('Error happened', error);
     })
    //  .on('ready', onWatcherReady)
     .on('raw', function(event, path, details) {
          // This event should be triggered everytime something happens.
     });
}



function createWindow () {

    // Create the browser window.
    var win = new BrowserWindow({
        name: "My app window",
        width: 450,
        height: 230,
        transparent: true,
        toolbar: false,
        frame: false,
    });


    win.setVisibleOnAllWorkspaces(true);

    // and load the index.html of the app.
    win.loadURL(appPath + 'index.html');

    // Emitted when the window is closed.
    win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.

    win = null
    })


    return win;
}


function newWindow(title){
    console.log(title);
    if (title == null){
        title = "Window " + (global.sharedObj.windows.length + 1).toString() ;
        fse.mkdirSync(mainFolderPath + title);
        justCreated = true;
    }

    var win = createWindow();
    // Open the DevTools.
    win.webContents.openDevTools();

    global.sharedObj.windows.push(win);
    global.sharedObj.titles.push(title);
}

function startApp(){
    try{
        stats = fse.lstatSync(mainFolderPath);

        if (stats.isDirectory()) {
            var folders =  fse.readdirSync(mainFolderPath).filter(function(file) {
                    return fse.statSync(path.join(mainFolderPath, file)).isDirectory();
                });


            for(var i=0; i<folders.length; i++){
                newWindow(folders[i]);
            }

            if (folders.length == 0){
                newWindow(null);
            }
        }
    }
    catch (e){
        fse.mkdirSync(mainFolderPath); // create the main folder
        newWindow(null);
    }

    setWatcher();

}

// function startTopMenu(){
//     // to add it to the top bar
//     var menubar = require('menubar')
//
//     var mb = menubar({'index': appPath + 'menubar/topmenu.html', 'width':400, 'height': 200});
//
//     mb.on('ready', function ready () {
//        console.log("hello");
//     })
// }

function dockOnly(){

    if (isWindowed == false){
        return
    }

    convertToDock = true;

    var windows = global.sharedObj.windows;

    vp = windows.length;

    for (var i = 0; i < windows.length; i++){
        windows[i].webContents.send("hello", {});

        windows[i].close();
    }

    isWindowed = false;
}

function windowedApp(){

    if (isWindowed == true){
        return;
    }

    var menu = new Menu();
    app.dock.setMenu(menu);
    startApp();

    isWindowed = true;
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function (){

    var MainMenu =  Menu.buildFromTemplate([
        {
            label: "DF",
            submenu: [
                {
                    label: 'Mode',
                    submenu: [
                        {
                            label: "Dock Only",
                            click: () => dockOnly()
                        },
                        {
                            label: 'Windows',
                            click: () => windowedApp()
                        }
                    ]
                },
                {
                    label: "Quit",
                    accelerator: 'Command+Q',
                    role: 'quit'
                }

            ]
        }
    ]);


    Menu.setApplicationMenu(MainMenu);

    startApp();
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (convertToDock == true){
      convertToDock = false;
      return;
  }
  app.quit();
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.

  var win = global.sharedObj.windows[0];

  if (win === null) {
    startApp();

  }
})
