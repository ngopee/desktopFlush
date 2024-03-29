

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
let $ = require("jquery");

const MAIN_DIR = remote.getGlobal('sharedObj').appFolder;

var desktopPath = app.getPath('desktop');


var groupName;
var rightClickPosition = null
var rightClickFolderID = null;

var foldersDict = {}; // dictionary holding name to a tuple of old path and new path

// to hold the elements of seelcted folder (on single click)
var clickedFolderButton = null;
var clickedFolderText = null;

var itemsWaitingDeletion = 0;

const win = remote.getCurrentWindow();
var Win_height;
var Win_width;
var reduced = false;
var expanding = false;
var watcher;

var Win_index;

window.addEventListener("dragover",function(e){
  e = e || event;
  e.preventDefault();
},false);
window.addEventListener("drop",function(e){
  e = e || event;
  e.preventDefault();
},false);

// when main process sends changeTitle, change the title of the window with the new title
ipcRenderer.on('changeTitle' , function(event , data){
                groupName = data.newTitle;
                document.querySelector("#titleText").value = groupName;
                if (watcher){
                    watcher.close();
                    setWatcher();
                }

            });


ipcRenderer.on('getData', function(event, data){
    ipcRenderer.send("myFolderData", [groupName, getFolders()]);
});

/////////////////////////////////////////////

function getFolders(){
    var classes = document.querySelectorAll(".fileNameElement span");

    var folders = [];
    for (var i = 0; i < classes.length; i++){
        folders.push(classes[i].innerHTML);
    }

    return folders;
}

// set watcher over the folder of that group
function setWatcher(){
    console.log("setting Watcher");
    var path = desktopPath + "/" + MAIN_DIR + "/" + groupName;

     watcher = chokidar.watch(path, {
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


function init(){
    var size = win.getSize();
    Win_width = size[0];
    Win_height = size[1];

    initFolders();
}

// run in the beginning, to set the folders/files that are already in the group folder
function initFolders(){
    var getWindowIndex = require('electron').remote.require('./main').getWindowIndex;
    Win_index = getWindowIndex(win);

    groupName = remote.getGlobal('sharedObj').titles[Win_index];

    document.getElementById("titleText").value = groupName;  // set the title of the group

    var srcPath = desktopPath + "/" + MAIN_DIR + "/" + groupName;

    var files =  fse.readdirSync(srcPath).filter(function(file) {  // filter hidden files (starting with .)
            return file[0]!=='.';
        });

    document.querySelector("#box").onclick = function(e){
            if (clickedFolderButton != null){
                clickedFolderButton.style.backgroundColor = "transparent";
                clickedFolderButton.style.border = "0px";
                clickedFolderText.style.backgroundColor = "transparent";

            }
        };

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
            case ".doc":
            case ".docx":
                newFolder.src = "./icons/PagesDocument.png";
                break;
            case ".xlsx":
            case ".numbers":
                newFolder.src = "./icons/NumbersDocument.png";
                break;
            case ".key":
            case ".ppt":
            case ".pptx":
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
                newFolder.src = "./icons/generic-file-icon.png";
                break;
        }

    }

}

function removeClickedFolder(){
    clickedFolderButton.style.backgroundColor = "transparent";
    clickedFolderButton.style.border = "0px";
    clickedFolderText.style.backgroundColor = "transparent";
}

function clickFolder(folderImgContainer, nameHolder){
    clickedFolderButton = folderImgContainer;
    clickedFolderText = nameHolder;

    folderImgContainer.style.borderRadius = "3px";
    folderImgContainer.style.border = "2px solid rgb(124, 123, 125)";
    folderImgContainer.style.backgroundColor = "rgb(50,50,50)";

    nameHolder.style.borderRadius = '5px';
    nameHolder.style.backgroundColor = "blue";
}


function activateClick(elemt){

    var folderImgContainer = elemt.querySelector(".FolderIconContainer");
    var nameHolder = elemt.querySelector(".fileNameElement").getElementsByTagName("span")[0];
    clickFolder(folderImgContainer, nameHolder);
}


// creating the folder and add it to the app
function addFolderButton(fileName, newFilePath){
    // create the button that links it
    var newFolder = document.createElement("div"); // a div holding the button and the name of it
    newFolder.id = "__" + fileName;  // the id is the same name as the file
    newFolder.className = "folder";

    var fileNameElement = document.createElement("div");  // to have the name of the file
    fileNameElement.className = "fileNameElement";
    // not setting the name of the file as innerHTML to be able to adjust the size of colored area on click
    var nameHolder = document.createElement("span"); // to have the name of the file
    nameHolder.innerHTML = fileName;//modifyFileName(fileName);
    fileNameElement.appendChild(nameHolder);

    var folderImgContainer = document.createElement("div");  // a div to hold the folder/file icon to fix image aspect ratio
    folderImgContainer.className = "FolderIconContainer";

    var newFolderButton = document.createElement("img"); // the button that will run on clicking it

    setIcon(newFolderButton, newFilePath);

    newFolderButton.setAttribute("draggable", false);
    newFolderButton.className = "folderButton";

    folderImgContainer.appendChild(newFolderButton);

    newFolder.addEventListener('contextmenu', (e) => { // right click action
      e.preventDefault()
      rightClickPosition = {x: e.x, y: e.y}
    //   rightClickFolderID = e['target'].parentNode.id;  // the name of the folder
        rightClickFolderID = newFolder.id;
      menu.popup(win) // show the menu
    }, false)

    var c = this;
    newFolderButton.ondblclick = function(){
        var newFilePath = desktopPath + "/" + MAIN_DIR + "/" + groupName + "/" + fileName;    // the new path (inside a folder on the desktop)

        console.log(newFilePath);
        shell.openItem(newFilePath)  // opens it in the new file name path
    }

    fileNameElement.ondblclick = function(){
        var newFilePath = desktopPath + "/" + MAIN_DIR + "/" + groupName + "/" + fileName;    // the new path (inside a folder on the desktop)

        console.log(newFilePath);
        shell.openItem(newFilePath)  // opens it in the new file name path
    }

    newFolderButton.onclick = function(e){ // the select action when clicking on the folder
        e.stopPropagation();
        if (clickedFolderButton != null){
            removeClickedFolder();
        }


        clickFolder(folderImgContainer, nameHolder);
    }

    fileNameElement.onclick = function(e){
        e.stopPropagation();
        if (clickedFolderButton != null){
            removeClickedFolder();
        }

        clickFolder(folderImgContainer, nameHolder);
    }


    newFolder.appendChild(folderImgContainer);
    // newFolder.appendChild(newFolderButton);
    newFolder.appendChild(fileNameElement);

    document.querySelector("#box").appendChild(newFolder);
}

function getEltIndex(node, classElts){
    for (var i = 0; i < classElts.length; i++){
        if(node == classElts[i])
            return i;
    }
    return -1;
}

document.onkeydown = function(e) {
    var allFolders = document.querySelectorAll(".folder");

    if (!clickedFolderButton){
        return;
    }

    switch (e.keyCode) {
        case 13:  // enter key
            var event = new MouseEvent('dblclick', {
                'view': window,
                'bubbles': true,
                'cancelable': true
              });
            clickedFolderButton.dispatchEvent(event);

            break;
        case 37: // left
            if (clickedFolderButton.parentNode === allFolders[0]){
                console.log("nothing to do");
                return;
            }
            // alert('left');
            removeClickedFolder();
            activateClick(clickedFolderButton.parentNode.previousSibling);
            break;
        case 38: // up
            var width = (win.getContentSize())[0];

            var diff = Math.floor(width / 109);  //105 is the folder width

            var elt = clickedFolderButton.parentNode;
            var classElts = document.querySelectorAll(".folder");

            var index = getEltIndex(elt, classElts);
            console.log(index, diff, classElts.length);

            if (index - diff < 0){
                return;
            } else{
                var topPos = classElts[index-diff].offsetTop;
                document.getElementById('box').scrollTop = topPos;

                removeClickedFolder();
                activateClick(classElts[index-diff]);
                break;
            }
        case 39: // right
            if (clickedFolderButton.parentNode === allFolders[allFolders.length-1]){
                console.log("nothing to do");
                return;
            }
            // alert('right');
            removeClickedFolder();
            activateClick(clickedFolderButton.parentNode.nextSibling);
            break;
        case 40: // down
            var width = (win.getContentSize())[0];

            var diff = Math.floor(width / 109);  //109 is the folder width

            var elt = clickedFolderButton.parentNode;
            var classElts = document.querySelectorAll(".folder");

            var index = getEltIndex(elt, classElts);
            console.log(index, diff, classElts.length);

            if (index + diff >= classElts.length){
                return;
            } else{

                // classElts[index+diff].scrollIntoView(false);
                var topPos = classElts[index+diff].offsetTop;
                document.getElementById('box').scrollTop = topPos - 70;

                removeClickedFolder();
                activateClick(classElts[index+diff]);
                break;
            }

            // alert('down');

    }
};

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
    console.log(buttonName);
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
    var oldPath = desktopPath + "/" + fileName;
    var newPath = desktopPath + "/" + MAIN_DIR + "/" + groupName + "/" + fileName;



    fse.move(newPath, oldPath, function (err) {  // move from original location to the new one
        if (err) return console.error(err)

        itemsWaitingDeletion -= 1;

        if (itemsWaitingDeletion == 0)
            deleteWindowFolder();

        // notification about where it was moved
        notifier.notify({
          title: 'Desktop Flush',
          message: fileName + " moved to " + oldPath,

        }, function (err, response) {
          // Response is response from notification
        });

  })

}

function deleteWindowFolder(){

    var groupName = document.querySelector("#titleText").value;

    console.log(groupName);
    var path = desktopPath + "/" + MAIN_DIR + "/" + groupName;

    rmdir(path, function(err, dirs, files){
        console.log("err", err);
        console.log(dirs);
        console.log(files);
    });
}

function removeGroup(){
    var folders = document.querySelectorAll(".folder");

    console.log(folders);

    if (folders.length==0){
        deleteWindowFolder();
        return;
    }

    for (var i = 0; i < folders.length; i++){
        itemsWaitingDeletion += 1;
        removeFolder(folders[i].id);
    }

}

// to ignore events
function ignoreEvent(event){
    event.preventDefault();
}

function showSettingsMenu(){
    createSettingsMenu(groupName);
    settingsMenu.popup(win) // show the menu
}

function enableTitleChange(){
    document.getElementById("titleText").disabled="";
}

// to save the new group name
function saveNewTitle(){
    watcher.close();
    document.getElementById("titleText").disabled="true";

    var updatedTitle = document.querySelector("#titleText").value;

    var oldName = desktopPath + "/" + MAIN_DIR + "/" + groupName;
    var newName = desktopPath + "/" + MAIN_DIR + "/" + updatedTitle;

    //global.sharedObj.titles[Win_index] = newName;

    remote.getGlobal("sharedObj").titles[Win_index] = newName;

    fse.rename(oldName, newName, function(err){
        if (err) console.log("err: ", err);
    });

    groupName = updatedTitle;
    setWatcher();
}

// reduce the size of the window
function reduce(){
    $('#box').slideUp(150, function(){
        reduced = true;

        win.setSize(Win_width, 30);
        var button = document.querySelector("#expandReduce");
        button.className = "fa fa-angle-down"; // change the icon shape

        button.onclick = expand;  //change the onclick event to expand

    }); //slide it up (animation)



}

// to show the window again after being reduced
function expand(){
    if (expanding == true){
        return;
    }
    expanding = true;
    win.setSize(Win_width, Win_height);
    reduced = false;

}


remote.getCurrentWindow().on("resize", function(){
    if (expanding == true){
        $('#box').slideDown(150, function(){
            expanding = false;
            var button = document.querySelector("#expandReduce");
            button.className = "fa fa-angle-up";  // change the icon
            button.onclick = reduce; // change the onclick event to reduce
        });

    }

    var win = remote.getCurrentWindow()
    var size = win.getSize();
    Win_width = size[0];

    if (reduced == true){
        return;
    }

    Win_height = size[1];
})

function mergeToFolder(currentGroup, toGroup){
    var path = desktopPath + "/" + MAIN_DIR + "/";
    var files = fse.readdirSync(path + currentGroup);
    files.forEach(function(file){
        fse.move(path + currentGroup + "/" + file, path + toGroup + "/" + file, function(err){
            if (err){
                console.log(err);
                return;
            }
            console.log("Done");

            rmdir(path+currentGroup, function(err, f, f2){
                if (err){
                    console.log(err);
                }
            });
        })
    });



}


// For development only
// pressing 1 will toggle the dev tools
// pressing 2 will reload the window
document.addEventListener("keydown", function (e) {
	if (e.which === 49) {
		win.toggleDevTools();
	} else if (e.which === 50) {
		location.reload();
	}
});



//
// // before quitting the window, save the data structure
// window.onbeforeunload = function onbeforeunload() {
//
//
//     // var saveData = require('electron').remote.require('./main').saveData;
//     //
//     // saveData(data);
// };
