const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getCases:    ()           => ipcRenderer.invoke("getCases"),
  getRepresentatives: ()    => ipcRenderer.invoke("getRepresentatives"),
  getNextId:   ()           => ipcRenderer.invoke("getNextId"),
  saveRepresentative: (representativeData) => ipcRenderer.invoke("saveRepresentative", representativeData),
  saveCase:    (caseData)   => ipcRenderer.invoke("saveCase", caseData),
  exportExcel: (casesData)  => ipcRenderer.invoke("exportExcel", casesData),
  backupDatabase: ()        => ipcRenderer.invoke("backupDatabase"),
  restoreDatabase: ()       => ipcRenderer.invoke("restoreDatabase")
});
