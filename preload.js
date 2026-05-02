const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getCases:    ()           => ipcRenderer.invoke("getCases"),
  getNextId:   ()           => ipcRenderer.invoke("getNextId"),
  saveCase:    (caseData)   => ipcRenderer.invoke("saveCase", caseData),
  exportExcel: (casesData)  => ipcRenderer.invoke("exportExcel", casesData),
  backupDatabase: ()        => ipcRenderer.invoke("backupDatabase"),
  restoreDatabase: ()       => ipcRenderer.invoke("restoreDatabase")
});
