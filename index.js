

// dependencies
const shell = require("electron").shell
const chokidar = require("chokidar");
const fse = require("fs-extra")
const app = remote.app;
const notifier = require('node-notifier');
const ipcRenderer =  require("electron").ipcRenderer;

var desktopPath = app.getPath('desktop');

var groupName;
let rightClickPosition = null
let rightClickFolderID = null;

var foldersDict = {}; // dictionary holding name to a tuple of old path and new path

// to hold the elements of seelcted folder (on single click)
var clickedFolderButton = null;
var clickedFolderText = null;

// when main process sends changeTitle, change the title of the window with the new title
ipcRenderer.on('changeTitle' , function(event , data){
                console.log(data.newTitle);
                groupName = data.newTitle;
                document.querySelector("#titleText").value = groupName;
            });

/////////////////////////////////////////////

// set watcher over the folder of that group
function setWatcher(){

    var path = desktopPath + "/test/" + groupName;

     var watcher = chokidar.watch(path, {
         ignored: /[\/\\]\./,
         ignoreInitial: true,
         persistent: true,
         depth: 1
     });

    //  // Declare the listeners of the watcher
     watcher
     .on('add', function(path) {

         var fileName = path.split("/");
         fileName = fileName[fileName.length-1];

         if (foldersDict[fileName]){
             return;
         }

         var newPath = desktopPath + "/test/" + groupName + "/" + fileName;

         foldersDict[fileName] = [desktopPath + "/" + fileName, newPath];

         addFolderButton(fileName, newPath);

           console.log('File', path, 'has been added');
     })
     .on('addDir', function(path) {

         var fileName = path.split("/");
         fileName = fileName[fileName.length-1];

         if (foldersDict[fileName]){
             return;
         }

         var newPath = desktopPath + "/test/" + groupName + "/" + fileName;

         foldersDict[fileName] = [desktopPath + "/" + fileName, newPath];

         addFolderButton(fileName, newPath);

         console.log('Directory', path, 'has been added');
     })
     .on('change', function(path) {
          console.log('File', path, 'has been changed');
     })
     .on('unlink', function(path) {
         var fileName = path.split("/");
         fileName = fileName[fileName.length-1];
         delete foldersDict[fileName];
         removeButton(fileName);
          console.log('File', path, 'has been removed');
     })
     .on('unlinkDir', function(path) {
         var dirName = path.split("/");
         dirName = dirName[dirName.length-1];
         delete foldersDict[dirName];
         removeButton(dirName);
          console.log('Directory', path, 'has been removed');
     })
     .on('error', function(error) {
          console.log('Error happened', error);
     })
    //  .on('ready', onWatcherReady)
     .on('raw', function(event, path, details) {
          // This event should be triggered everytime something happens.
          console.log('Raw event info:', event, path, details);
     });
}


////////////////////////////////////////////

//////// end of settings menu //////////////

// run in the beginning, to set the folders/files that are already in the group folder
function initFolders(){
    var index = remote.getCurrentWindow().id - 1;
    groupName = remote.getGlobal('sharedObj').titles[index];
    document.getElementById("titleText").value = groupName;  // set the title of the group

    var srcPath = desktopPath + "/test/" + groupName;

    var files =  fse.readdirSync(srcPath).filter(function(file) {
            return file[0]!=='.';
        });

    for (var i = 0; i < files.length; i++){
        var fileName = files[i];
        addFolderButton(fileName, srcPath + "/" + fileName);
    }

    setWatcher();

}

// creating the folder and add it to the app
function addFolderButton(fileName, newFilePath){
    // create the button that links it
    var newFolder = document.createElement("div"); // a div holding the button and the name of it
    newFolder.id = "__" + fileName;  // the id is the same name as the file
    newFolder.className = "folder";

    var fileNameElement = document.createElement("div");  // to have the name of the file
    fileNameElement.className = "fileNameElement";
    fileNameElement.innerHTML = fileName;

    var newFolderButton = document.createElement("img"); // the button that will run on clicking it
    newFolderButton.src = "./icons/GenericFolderIcon.png";
    newFolderButton.setAttribute("draggable", false);
    newFolderButton.className = "folderButton";

    newFolder.addEventListener('contextmenu', (e) => { // right click action
      e.preventDefault()
      rightClickPosition = {x: e.x, y: e.y}
      rightClickFolderID = e['target'].parentNode.id;  // the name of the folder
      menu.popup(remote.getCurrentWindow()) // show the menu
    }, false)

    var c = this;
    newFolder.ondblclick = function(){
        var newFilePath = desktopPath + "/test/" + groupName + "/" + fileName;    // the new path (inside a folder on the desktop)

        console.log(newFilePath);
        shell.openItem(newFilePath)  // opens it in the new file name path
    }

    newFolder.onclick = function(){
        if (clickedFolderButton != null){
            clickedFolderButton.style.backgroundColor = "transparent";
            clickedFolderText.style.backgroundColor = "transparent";

        }

        clickedFolderButton = newFolderButton;
        clickedFolderText = fileNameElement;

        newFolderButton.style.backgroundColor = "gray";
        fileNameElement.style.backgroundColor = "blue";

    }


    newFolder.appendChild(newFolderButton);
    newFolder.appendChild(fileNameElement);

    document.querySelector("#box").appendChild(newFolder);
}

// function that runs on the drop event to add the folder button
function addFolder(event){
    event.preventDefault();

    var filePath = event.dataTransfer.files[0].path; // the original path of the file

    var fileName = filePath.split("/");
    var fileName = fileName[fileName.length - 1];

    var newFilePath = desktopPath + "/test/" + groupName + "/" + fileName;    // the new path (inside a folder on the desktop)

    fse.move(filePath, newFilePath, function (err) {  // move from original location to the new one
          if (err) return console.error(err)
          console.log("success!")
    })

    addFolderButton(fileName, newFilePath); // create the button and add it

    foldersDict[fileName] = [filePath, newFilePath]; //tuple of the orginal path and new path
}

// remove the button from the DOM
function removeButton(buttonName) {
  var elem = document.getElementById("__" + buttonName);
  elem.parentNode.removeChild(elem);
}

//function to remove folder from window and put it back on desktop
function removeFolder(){
    var fileName = rightClickFolderID.split("__")[1];

    // if it is in the data structure, move it to the original place, otherwise move it to the desktop
    if (!foldersDict[fileName]){
        var oldPath = desktopPath + "/" + fileName;
        var newPath = desktopPath + "/test/" + groupName + "/" + fileName;
    } else{
        var oldPath = foldersDict[fileName][0];
        var newPath = foldersDict[fileName][1];
    }

  fse.move(newPath, oldPath, function (err) {  // move from original location to the new one
        if (err) return console.error(err)
        delete foldersDict[fileName]; // delete the folder from the dictionary

        // notification about where it was moved
        notifier.notify({
          title: 'Desktop Flush',
          message: fileName + " moved to " + oldPath,

        }, function (err, response) {
          // Response is response from notification
        });

  })

}

// to ignore events
function ignoreEvent(event){
    event.preventDefault();
}


// show settings button when hovering over the title
function showSettings(){
    document.querySelector("#settingsButton").style.visibility = 'visible';
}

// hide settings button when outside the title bar
function hideSettings(){
    document.querySelector("#settingsButton").style.visibility = 'hidden';
}

function showSettingsMenu(){
    settingsMenu.popup(remote.getCurrentWindow()) // show the menu
}

function enableTitleChange(){
    document.getElementById("titleText").disabled="";
}

// to save the new group name
function saveNewTitle(){
    document.getElementById("titleText").disabled="true";

    var updatedTitle = document.querySelector("#titleText").value;

    var oldName = desktopPath + "/test/" + groupName;
    var newName = desktopPath + "/test/" + updatedTitle;

    fse.rename(oldName, newName, function(err){
        if (err) throw err;
    });

    groupName = updatedTitle;
}


 function changeBackgroundColor(color) {
   document.querySelector("#box").style.backgroundColor=color;
}

// before quitting the window, save the data structure
window.onbeforeunload = function onbeforeunload() {
    var data = [{'folders':foldersDict, 'title': groupName}];

    fse.writeFile("data.txt", JSON.stringify(data), function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });

};
