const {app, BrowserWindow, Menu, MenuItem, ipcMain} = require('electron')
const fse = require("fs-extra");
const path = require("path");
const chokidar = require("chokidar");
const shell = require("electron").shell;
const storage = require('electron-json-storage');

const APP_PATH = `file://${__dirname}/`;

const DESKTOP_PATH = app.getPath('desktop');

const MAIN_DIR = 'DesktopFlush';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
global.sharedObj = {windows: [], titles:[], appFolder: MAIN_DIR, desktopPath: DESKTOP_PATH};

exports.newWindow = newWindow;
exports.getWindowIndex = getWindowIndex;
exports.batchedWindowCreating = batchedWindowCreating;


function getMainFolderPath(){
    return DESKTOP_PATH + "/" + global.sharedObj.appFolder + "/";
}

require('electron-reload')(__dirname);

// app.setAboutPanelOptions({"applicationName": "Desktop Flush", "applicationVersion": '1.0.0', "credits":'John and Naassih'});

// appMode 0 is windowed, 1 is dockOnly
var appMode = 0;

var startingApp = true;

var renamedFolderTitle = "";
var vp = 0;

var justCreated = false;


var watcher;

// // to add it to the top bar
// var menubar = require('menubar')
//
//
// var mb = menubar({'index': APP_PATH + 'menubar/topmenu.html', 'width':400, 'height': 200, 'showDockIcon': true});
//
// mb.on('ready', function ready () {
//    console.log("hello");
// })


// app.dock.hide(); // to hide it from the dock

var dockMenu = [];

function createMenuList(groupName, data){
    console.log(data);

    var menu = new Menu();

    var path = DESKTOP_PATH + "/" + global.sharedObj.appFolder + "/" + groupName + "/";    // the new path (inside a folder on the desktop)

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

ipcMain.on("myFolderData", (event, data) => {

    console.log("receiving...");

    var menu = new MenuItem(
        {
            label: data[0],
            submenu: createMenuList(data[0], data[1])
        });


    vp = vp - 1;
    dockMenu.push(menu);

    // data[2] hold the index of the window
    global.sharedObj.windows[data[2]].close();

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
    var folders =  fse.readdirSync(getMainFolderPath()).filter(function(file) {
            return fse.statSync(path.join(getMainFolderPath(), file)).isDirectory();
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
    var path = getMainFolderPath();

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

function createPreference(){
    // Create the browser window.
    var win = new BrowserWindow({
        name: "My app window",
        width: 750,
        height: 450,
        show: false
    });

    win.once('ready-to-show', () => {
        win.show();
    });

    win.setVisibleOnAllWorkspaces(true);

    win.webContents.openDevTools();
    // and load the index.html of the app.
    win.loadURL(APP_PATH + 'index2.html');

    // Emitted when the window is closed.
    win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
        var ind = getWindowIndex(win);
        global.sharedObj.windows.splice(ind, 1);
        global.sharedObj.titles.splice(ind, 1);
        win = null
    })


    return win;
}


function createWindow () {

    // Create the browser window.
    var win = new BrowserWindow({
        name: "My app window",
        width: 450,
        height: 230,
        minWidth: 230,
        minHeight: 30,
        transparent: true,
        toolbar: false,
        frame: false,
        show: false
    });

    if (appMode == 0){
        win.once('ready-to-show', () => {
            win.show();
        });

        win.setVisibleOnAllWorkspaces(true);

        win.webContents.openDevTools();
    }

    // and load the index.html of the app.
    win.loadURL(APP_PATH + 'index.html');

    // Emitted when the window is closed.
    win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
        var ind = getWindowIndex(win);
        global.sharedObj.windows.splice(ind, 1);
        global.sharedObj.titles.splice(ind, 1);
        win = null
    })


    return win;
}


function newWindow(title){
    console.log(title);
    if (title == null){
        title = "Window " + (global.sharedObj.windows.length + 1).toString() ;
        fse.mkdirSync(getMainFolderPath() + title);
        justCreated = true;
    }

    var win = createWindow();

    global.sharedObj.windows.push(win);
    global.sharedObj.titles.push(title);
}


function batchedWindowCreating(data){

    fse.mkdirSync(getMainFolderPath());

    for (var i=0; i < data.length; i++){
        var windowName = data[i].windowTitle;
        if (windowName == ""){
            windowName ="Window " + (i+1);
        }
        var newFolderPath = getMainFolderPath() + windowName;
        fse.mkdirSync(newFolderPath);
        var folders = data[i].folders;
        for(var j=0; j < folders.length; j++){
            var oldPath = DESKTOP_PATH + "/" + folders[j];
            var newPath = newFolderPath + "/" + folders[j];
            fse.move(oldPath, newPath, function(err){
                if (err){
                    console.log(error);
                    return;
                }

            });
        }
    }

    initialize();
}


function initialize(){
    try{
        stats = fse.lstatSync(getMainFolderPath());

        if (stats.isDirectory()) {
            var folders =  fse.readdirSync(getMainFolderPath()).filter(function(file) {
                    return fse.statSync(path.join(getMainFolderPath(), file)).isDirectory();
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
        fse.mkdirSync(getMainFolderPath()); // create the main folder
        newWindow(null);
    }

    setWatcher();

}

function startApp(){

    storage.has("firstTime", function(err, runBefore){
        if (runBefore){
            storage.set("firstTime", "True", function(err){
                console.log(err)
            });
           createPreference();
       } else{

            startingApp = true;
            storage.has("data", function (error, hasKey){
                if (error){
                    console.log("ERROR CHECKING DATA");
                    return;
                }

                if (hasKey){
                    // if key is found get the data with the mode
                    storage.get("data", function(error, data){
                        console.log(data);
                        if (error){
                            console.log("ERR Retrieving");
                            initialize();
                            return;
                        }
                        if (data["mode"] == "dock"){
                            appMode = 1;
                            initialize();
                            dockOnly();
                        } else if (data["mode"] == "window"){
                            appMode = 0;
                            initialize();
                            console.log("window");
                        }

                        startingApp = false;

                    })

                } else{
                    initialize();
                    startingApp = false;
                }

            });
        }
    });



}

// function startTopMenu(){
//     // to add it to the top bar
//     var menubar = require('menubar')
//
//     var mb = menubar({'index': APP_PATH + 'menubar/topmenu.html', 'width':400, 'height': 200});
//
//     mb.on('ready', function ready () {
//        console.log("hello");
//     })
// }

function dockOnly(){
    storage.set('data', {mode: 'dock'}, function (err){
        if (err) console.log(error);
    });

    if (appMode == 1 && !startingApp){
        return
    }

    appMode = 1;

    var windows = global.sharedObj.windows;
    vp = windows.length;

    for (var i = 0; i < windows.length; i++){
        if (windows[i].isVisible()){
            windows[i].webContents.send('getData', {Win_index: i});
        }
        else {
            windows[i].on('ready-to-show', (d) => { // if it wasn't ready yet, send the signal when it is ready
                d.sender.send('getData', {Win_index:getWindowIndex(d.sender)});
            });
        }


    }

}

function windowedApp(){
    dockMenu = [];

    storage.set('data', {mode: 'window'}, function (err){
        if (err) console.log(error);
    });

    if (appMode == 0 && !startingApp){
        return;
    }

    appMode = 0;
    var menu = new Menu();
    app.dock.setMenu(menu);
    initialize();
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
                    label: "New Group",
                    click: () => newWindow(null)
                },
                {
                    label: "Quit",
                    accelerator: 'Command+Q',
                    position: "endof=preferences",
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
  if (appMode != 0){
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
