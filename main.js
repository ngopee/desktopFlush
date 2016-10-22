const {app, BrowserWindow} = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.

global.sharedObj = {windows: [], titles:[], appFolder: 'test'};

const MAIN_DIR = global.sharedObj.appFolder;

exports.newWindow = newWindow;
exports.getWindowIndex = getWindowIndex;

const fse = require("fs-extra");
const path = require("path");
const chokidar = require("chokidar");

const appPath = `file://${__dirname}/`;
const desktopPath = app.getPath('desktop');
const mainFolderPath = desktopPath + "/" + MAIN_DIR + "/";


var renamedFolderTitle = "";

var justCreated = false;

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
     .on('addDir', function(path) {
         if (justCreated == true){
             justCreated = false;
             return;
         }
         var fileName = path.split("/");
         fileName = fileName[fileName.length-1];

         var numOfGroups = getNumOfGroups();

         if (numOfGroups == global.sharedObj.windows.length){
             var index = getWindowIndexByName(renamedFolderTitle);

             if (index == -1){
                 console.log("error");
                 return;
             }

             global.sharedObj.titles[index] = fileName;  //renaming of title

             global.sharedObj.windows[index].webContents.send("changeTitle", {newTitle: fileName});

             return;
         }

         newWindow(fileName);
         console.log('Directory', path, 'has been added');
     })
     .on('change', function(path) {
          console.log('File', path, 'has been changed');
     })
     .on('unlink', function(path) {
         var fileName = path.split("/");
         fileName = fileName[fileName.length-1];

          console.log('File', path, 'has been removed');
     })
     .on('unlinkDir', function(path) {
         var dirName = path.split("/");
         dirName = dirName[dirName.length-1];

         var numOfGroups = getNumOfGroups();

         if (numOfGroups != global.sharedObj.windows.length){
             console.log("close window");
             var index = getWindowIndexByName(dirName);
             global.sharedObj.windows[index].close();

             console.log(global.sharedObj.titles);

             global.sharedObj.windows.splice(index, 1);
             global.sharedObj.titles.splice(index, 1);

            console.log(global.sharedObj.titles);
             return;
         }

         renamedFolderTitle = dirName;

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
        }
    }
    catch (e){
        fse.mkdirSync(mainFolderPath); // create the main folder

        newWindow(null);

    }

    setWatcher();


}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', startApp)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
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
