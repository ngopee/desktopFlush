

// dependencies
const shell = require("electron").shell
const chokidar = require("chokidar");
const fse = require("fs-extra")
const app = remote.app;
const notifier = require('node-notifier');
const ipcRenderer =  require("electron").ipcRenderer;
const plist = require("plist");
const iconutil = require("iconutil");
const path = require("path");
const rmdir = require("rmdir");

const MAIN_DIR = remote.getGlobal('sharedObj').appFolder;

var desktopPath = app.getPath('desktop');


var groupName;
var rightClickPosition = null
var rightClickFolderID = null;

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

    var path = desktopPath + "/" + MAIN_DIR + "/" + groupName;

     var watcher = chokidar.watch(path, {
         ignored: /[\/\\]\./,
         ignoreInitial: true,
         persistent: true,
         depth: 0
     });

    //  // Declare the listeners of the watcher
     watcher
     .on('add', function(path) {

         var fileName = path.split("/");
         fileName = fileName[fileName.length-1];

         if (foldersDict[fileName]){
             return;
         }

         var newPath = desktopPath + "/" + MAIN_DIR + "/" + groupName + "/" + fileName;

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

         var newPath = desktopPath + "/" + MAIN_DIR + "/" + groupName + "/" + fileName;

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
    var getWindowIndex = require('electron').remote.require('./main').getWindowIndex;
    var index = getWindowIndex(remote.getCurrentWindow());

    groupName = remote.getGlobal('sharedObj').titles[index];

    document.getElementById("titleText").value = groupName;  // set the title of the group

    var srcPath = desktopPath + "/" + MAIN_DIR + "/" + groupName;

    var files =  fse.readdirSync(srcPath).filter(function(file) {  // filter hidden files (starting with .)
            return file[0]!=='.';
        });

    for (var i = 0; i < files.length; i++){
        var fileName = files[i];
        var filePath = srcPath + "/" + fileName;
        addFolderButton(fileName, filePath);
    }

    setWatcher();

}

// based on http://stackoverflow.com/questions/1431094/how-do-i-replace-a-character-at-a-particular-index-in-javascript
function setCharsAt(str,index1, index2) {
    if(index > str.length-1) return str;
    return ;
}


function modifyFileName(fileName){
    var strLength = fileName.length;
    if (strLength > 20){
        return fileName.substr(0,4) + "..." + fileName.substr(strLength-4);
    }
    else if (strLength > 10 && fileName.indexOf(" ") < 0){
        return fileName.substr(0, 10) + "\n" + fileName.substr(10);
    }
    return fileName;
}


function setIcon(newFolder, filePath){
     // get the extension for the file - if folder no extension and if app it will be .app
    var extension = path.extname(filePath);

    // check if the new element is a directory
    if (fse.statSync(filePath).isDirectory()) {
        if (extension == ".app"){ // if it is an app
            var obj = plist.parse(fse.readFileSync(filePath + "/Contents/Info.plist", 'utf8')); // parse the plist to get the name of the icon
            var iconFileName = obj['CFBundleIconFile']; // get the icon name from the object returned by the plist

            var iconPath = filePath + "/Contents/Resources/" + iconFileName; //the path for the icon file

            if (iconFileName.substr(iconFileName.length - 5) !== '.icns'){  // if it didn't have .icns already in the plist then add it to the path
                iconPath = iconPath + '.icns';
            }

             // convert the icns to png data to be able to use it in html
            iconutil.toIconset(iconPath, function(err, icons) {
                if (err){   // if there was an error, print it and return
                    console.log("ERR", err);
                    return;
                }
                // get the list of the icons from iconset
                var listOfIcons = Object.keys(icons);
                // get the last icon
                var iconName = listOfIcons[listOfIcons.length - 1];
                var buff = icons[iconName].toString('base64');
                 newFolder.src = 'data:image/png;base64,' + buff; // set the source to the data of png


            });
        } else{ // if it is a normal folder, show the regular folder icon
             newFolder.src = "./icons/GenericFolderIcon.png";
        }
    }
    else{  // it is a file, get the file icon
        switch(extension){
            case ".pdf":
                newFolder.src = "./icons/pdf.png";
                break;
            case ".pages":
                newFolder.src = "./icons/PagesDocument.png";
                break;
            case ".numbers":
                newFolder.src = "./icons/NumbersDocument.png";
                break;
            case ".key":
                newFolder.src = "./icons/KeyDocument.png";
                break;
            case ".txt":
                newFolder.src = "./icons/txt.png";
                break;
            case ".png":
            case ".jpg":
            case ".jpeg":
                newFolder.src = filePath;
                break;
            default:
                newFolder.src = "./icons/Settings.png";
                break;
        }

    }



}

// creating the folder and add it to the app
function addFolderButton(fileName, newFilePath){
    // create the button that links it
    var newFolder = document.createElement("div"); // a div holding the button and the name of it
    newFolder.id = "__" + fileName;  // the id is the same name as the file
    newFolder.className = "folder";

    var fileNameElement = document.createElement("div");  // to have the name of the file
    fileNameElement.className = "fileNameElement";
    fileNameElement.innerHTML = modifyFileName(fileName);

    var newFolderButton = document.createElement("img"); // the button that will run on clicking it

    setIcon(newFolderButton, newFilePath);

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
        var newFilePath = desktopPath + "/" + MAIN_DIR + "/" + groupName + "/" + fileName;    // the new path (inside a folder on the desktop)

        console.log(newFilePath);
        shell.openItem(newFilePath)  // opens it in the new file name path
    }

    newFolder.onclick = function(){
        if (clickedFolderButton != null){
            clickedFolderButton.style.backgroundColor = "transparent";
            clickedFolderButton.style.border = "0px";
            clickedFolderText.style.backgroundColor = "transparent";

        }

        clickedFolderButton = newFolderButton;
        clickedFolderText = fileNameElement;

        // newFolderButton.style.backgroundColor = "gray";
        newFolderButton.style.border = "2px solid rgb(124, 123, 125)";
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

    var newFilePath = desktopPath + "/" + MAIN_DIR + "/" + groupName + "/" + fileName;    // the new path (inside a folder on the desktop)

    fse.move(filePath, newFilePath, function (err) {  // move from original location to the new one
          if (err) return console.error(err)
          console.log("success!");
          addFolderButton(fileName, newFilePath); // create the button and add it

          foldersDict[fileName] = [filePath, newFilePath]; //tuple of the orginal path and new path
    });


}

// remove the button from the DOM
function removeButton(buttonName) {
  var elem = document.getElementById("__" + buttonName);
  elem.parentNode.removeChild(elem);
}

//function to remove folder from window and put it back on desktop
function removeFolder(fileNameID){
    var fileName;
    if (fileNameID == null)
        fileName = rightClickFolderID.split("__")[1];
    else{
        fileName = fileNameID.split("__")[1];
    }

    // if it is in the data structure, move it to the original place, otherwise move it to the desktop
    if (!foldersDict[fileName]){
        var oldPath = desktopPath + "/" + fileName;
        var newPath = desktopPath + "/" + MAIN_DIR + "/" + groupName + "/" + fileName;
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

function removeGroup(){
    var folders = document.querySelectorAll(".folder");

    for (var i = 0; i < folders.length; i++){
        removeFolder(folders[i].id);
    }

    var groupName = document.querySelector("#titleText").innerHTML;

    var path = desktopPath + "/" + MAIN_DIR + "/" + groupName;
    console.log(path);

    rmdir(path, function(err, dirs, files){
        console.log("err", err);
        console.log(dirs);
        console.log(files);
    });
}

// to ignore events
function ignoreEvent(event){
    event.preventDefault();
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

    var oldName = desktopPath + "/" + MAIN_DIR + "/" + groupName;
    var newName = desktopPath + "/" + MAIN_DIR + "/" + updatedTitle;

    fse.rename(oldName, newName, function(err){
        if (err) console.log("err: ", err);
    });

    groupName = updatedTitle;
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
