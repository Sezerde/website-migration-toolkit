function replaceAndVerifyLinks_Final() {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
 
  // setting
  var folderId = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';
// Example: If your Drive folder URL is https://drive.google.com/drive/folders/xxxx,
  // then your FOLDER_ID is 'xxxx'
  var targetFolder = DriveApp.getFolderById(folderId);
  var oldDomainSubstring = 'YOUR_OLD_DOMAIN_PREFIX';
// Example: If the old website links look like https://www-users.xxx,
  // then your OLD_DOMAIN_PREFIX could be 'xxxx'
 
  var paragraphs = body.getParagraphs();
  var replacedCount = 0;
  var missedCount = 0;
  var HIGHLIGHT_SUCCESS = true;
 
  var baseNameMap = {};
  var orangeLogs = [];
 
  for (var i = 0; i < paragraphs.length; i++) {
    var textObj = paragraphs[i].editAsText();
    var textString = textObj.getText();
    if (textString.length === 0) continue;
   
    var indices = textObj.getTextAttributeIndices();
    for (var j = 0; j < indices.length; j++) {
      var start = indices[j];
      var url = textObj.getLinkUrl(start);
     
      if (url && url.indexOf(oldDomainSubstring) > -1) {
        var filename = url.substring(url.lastIndexOf('/') + 1);
        filename = filename.split('?')[0].split('#')[0];
        filename = decodeURIComponent(filename);
        if (!filename) continue;
       
        var lastDotIndex = filename.lastIndexOf('.');
        var baseName = lastDotIndex > 0 ? filename.substring(0, lastDotIndex).toLowerCase() : filename.toLowerCase();
        var ext = lastDotIndex > 0 ? filename.substring(lastDotIndex).toLowerCase() : "";
       
        if (!baseNameMap[baseName]) {
          baseNameMap[baseName] = [];
        }
       
        var isDuplicate = false;
        for(var k=0; k < baseNameMap[baseName].length; k++) {
            if(baseNameMap[baseName][k].url === url) { isDuplicate = true; break; }
        }
        if(!isDuplicate) {
            baseNameMap[baseName].push({ url: url, ext: ext, fullName: filename });
        }
      }
    }
  }
 
  var collisionBlacklist = {};
  for (var base in baseNameMap) {
    var items = baseNameMap[base];
    for (var m = 0; m < items.length; m++) {
      for (var n = m + 1; n < items.length; n++) {
        var item1 = items[m];
        var item2 = items[n];
        if (item1.url !== item2.url) {
          if (item1.ext === item2.ext || item1.ext === '' || item2.ext === '') {
            collisionBlacklist[item1.fullName] = true;
            collisionBlacklist[item2.fullName] = true;
          }
        }
      }
    }
  }
 
  for (var i = 0; i < paragraphs.length; i++) {
    var textObj = paragraphs[i].editAsText();
    var textString = textObj.getText();
    if (textString.length === 0) continue;
   
    var indices = textObj.getTextAttributeIndices();
    for (var j = 0; j < indices.length; j++) {
      var start = indices[j];
      var end = (j + 1 < indices.length) ? indices[j + 1] : textString.length;
      var url = textObj.getLinkUrl(start);
     
      if (url && url.indexOf(oldDomainSubstring) > -1) {
        var filename = url.substring(url.lastIndexOf('/') + 1);
        filename = filename.split('?')[0].split('#')[0];
        filename = decodeURIComponent(filename);
        var visibleText = textString.substring(start, end);
       
        if (!filename) {
          textObj.setBackgroundColor(start, end - 1, '#f4cccc');
          missedCount++;
          continue;
        }
       
        if (collisionBlacklist[filename]) {
          textObj.setBackgroundColor(start, end - 1, '#FC9C3B');
          missedCount++;
          orangeLogs.push("Text: [" + visibleText + "] | Source URL Conflict: " + url);
          continue;
        }
       
        var files = targetFolder.getFilesByName(filename);
        var finalFile = null;
        var collisionDetected = false;


        if (files.hasNext()) {
          finalFile = files.next();
          if (files.hasNext()) collisionDetected = true;
        } else {
          var lastDotIndex = filename.lastIndexOf('.');
          var currentBaseName = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
          var query = "title contains '" + currentBaseName.replace(/'/g, "\\'") + "'";
          var fuzzySearch = targetFolder.searchFiles(query);
          var possibleMatches = [];
         
          while (fuzzySearch.hasNext()) {
            var f = fuzzySearch.next();
            if (f.getName().toLowerCase().indexOf(currentBaseName.toLowerCase()) === 0) {
              possibleMatches.push(f);
            }
          }
          if (possibleMatches.length === 1) {
            finalFile = possibleMatches[0];
          } else if (possibleMatches.length > 1) {
            collisionDetected = true;
          }
        }


        if (collisionDetected) {
          textObj.setBackgroundColor(start, end - 1, '#FC9C3B');
          missedCount++;
          orangeLogs.push("Text: [" + visibleText + "] | Drive File Collision: " + url);
        } else if (finalFile) {
          textObj.setLinkUrl(start, end - 1, finalFile.getUrl());
          replacedCount++;
          if (HIGHLIGHT_SUCCESS) textObj.setBackgroundColor(start, end - 1, '#7DE8BF');
        } else {
          textObj.setBackgroundColor(start, end - 1, '#f4cccc');
          missedCount++;
        }
      }
    }
  }
 
  console.log("Replacement Complete! Successfully replaced: " + replacedCount + ". Failed/Flagged: " + missedCount + ".");
 
  if (orangeLogs.length > 0) {
    console.log("\n=== Action Required: Orange Links (Total: " + orangeLogs.length + " items) ===");
    for (var k = 0; k < orangeLogs.length; k++) {
      console.log((k + 1) + ". " + orangeLogs[k]);
    }
    console.log("==========================================================");
    console.log("Please find the texts above in the document and manually link to the correct file in Google Drive.");
  }
}

