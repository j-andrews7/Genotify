const electron = require('electron');
const {Menu} = require('electron');
const {app} = require('electron');
// const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const clipboard = electron.clipboard;
const globalShortcut = electron.globalShortcut;
const ipcMain = require('electron').ipcMain;

const path = require('path');
const url = require('url');

let mainWindow;
let windowSender;

app.setName('Genotify');

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 450,
        height: 1250,
        minWidth: 450,
        icon: path.join(__dirname, 'assets/icons/png/64x64.png')
    });

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
    
    ipcMain.on('loaded', function(event) {
        windowSender = event.sender;
    });
    
    const ret = globalShortcut.register('CommandOrControl+Q', function() {
        windowSender.send('queryFromClipboard', clipboard.readText());
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const template = [
{
  label: 'Edit',
  submenu: [
    {role: 'cut'},
    {role: 'copy'},
    {role: 'paste'}
  ]
},
{
  label: 'View',
  submenu: [
    {role: 'reload'},
    {role: 'forcereload'},
    {role: 'resetzoom'},
    {role: 'zoomin'},
    {role: 'zoomout'},
    {role: 'togglefullscreen'},
    {role: 'toggledevtools'}
  ]
},
{
  role: 'window',
  submenu: [
    {role: 'minimize'},
    {role: 'close'}
  ]
},
{
  role: 'help',
  submenu: [
    {
      label: 'How to Use',
      click () { require('electron').shell.openExternal('https://github.com/j-andrews7/GenotifyDesktop/') }
    }
  ]
}
]

if (process.platform === 'darwin') {
template.unshift({
  label: app.getName(),
  submenu: [
    {role: 'about'},
    {type: 'separator'},
    {role: 'services', submenu: []},
    {type: 'separator'},
    {role: 'hide'},
    {role: 'hideothers'},
    {role: 'unhide'},
    {type: 'separator'},
    {role: 'quit'}
  ]
})

// Edit menu
template[1].submenu.push(
  {type: 'separator'},
  {
    label: 'Speech',
    submenu: [
      {role: 'startspeaking'},
      {role: 'stopspeaking'}
    ]
  }
)

// Window menu
template[3].submenu = [
  {role: 'close'},
  {role: 'minimize'},
  {role: 'zoom'},
  {type: 'separator'},
  {role: 'front'}
]
}

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
