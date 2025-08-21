/**
 * Author: Igromanru
 * Source: https://github.com/igromanru/My-Habitica-Scripts
 * Version: 0.1.3
 * Description: Script that automatically buys Enchanted Armoire and sends information about received items to the user
 */
// ------------- Set Up ---------------------------------------
const USER_ID = "";
const API_TOKEN = "";
// --------- Configurations -----------------------------------
const AUTO_BUY_ENCHANTED_ARMOIRE = true;
const BUY_ENCHANTED_ARMOIRE_OVER_X_GOLD = 1100;
const SEND_PM_WITH_ENCHANTED_ARMOIRE_ITEM_INFO = true;

// If you install the trigger, it will execute autoBuyEnchantedArmoire each X hours
const TRIGGER_AUTO_BUY_ENCHANTED_ARMOIRE_EACH_X_HOURS = 4;
// ------------------------------------------------------------
// --------- Code - Edit at your own responsibility -----------
const Headers = {
  'x-api-user': USER_ID,
  'x-api-key': API_TOKEN,
  'x-client': USER_ID + '-' + DriveApp.getFileById(ScriptApp.getScriptId()).getName()
};
const baseUrl = 'https://habitica.com/api';
const userAPI = baseUrl + '/v3/user';
const membersAPI = baseUrl + '/v3/members';

const enchantedArmoireCost = 100;

/**
 * Main function. Can be executed manuelly or will be executed through the autoBuyEnchantedArmoireTrigger function
 */
function autoBuyEnchantedArmoire() {
  const user = getUser();
  if (user) {
    const buyOverOrEqual = BUY_ENCHANTED_ARMOIRE_OVER_X_GOLD;
    const currentGold = user.data.stats.gp;

    const toBuyCount = Math.floor((currentGold - (buyOverOrEqual - enchantedArmoireCost)) / enchantedArmoireCost);
    if (toBuyCount > 0) {
      console.log(`autoBuyEnchantedArmoire: Current Gold (${currentGold}) is or over ${buyOverOrEqual}, buying Enchanted Armoire ${toBuyCount} times.`);

      var pmMessage = '**Bought Enchanted Armoire:**  \n';
      var boughtCount = 0;
      for (var i = 0; i < toBuyCount; i++) {
        const responseJson = buyEnchantedArmoire();
        if (responseJson) {
          pmMessage += `${JSON.stringify(responseJson.data.armoire)}  \n`;
          boughtCount++;
        } else {
          break;
        }
      }
      if (SEND_PM_WITH_ENCHANTED_ARMOIRE_ITEM_INFO) {
        pmMessage += `**Successfully bought: ${boughtCount} out of ${toBuyCount}**`;
        sendPM(USER_ID, pmMessage)
      }
    }
  }
}

/**
 * Install scheduled triggers
 */
function installTrigger() {
  uninstallTrigger();
  console.log("Creating triggers...");

  const trigger = ScriptApp.newTrigger(autoBuyEnchantedArmoireTrigger.name)
    .timeBased()
    .everyHours(TRIGGER_AUTO_BUY_ENCHANTED_ARMOIRE_EACH_X_HOURS)
    .create();
  
  if (trigger) {
    console.log("Trigger created for: " + trigger.getHandlerFunction());
  }
}

/**
 * Uninstall scheduled triggers
 */
function uninstallTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length > 0) {
    console.log("Deleting triggers");

    for (const trigger of triggers) {
      const functionName = trigger.getHandlerFunction();
      if (functionName == autoBuyEnchantedArmoireTrigger.name) {
        ScriptApp.deleteTrigger(trigger);
        console.log("Trigger deleted: " + functionName);
      }
    }
  }
}

/**
 * Function to be used in timed trigger.  
 * The function is only needed if you want to be able to switch timed execution on/off without deleting the trigger.
 */
function autoBuyEnchantedArmoireTrigger() {
  if (AUTO_BUY_ENCHANTED_ARMOIRE) {
    autoBuyEnchantedArmoire();
  }
}

/**
 * Buy an Enchanted Armoire item
 */
function buyEnchantedArmoire() {
  const response = UrlFetchApp.fetch(
    `${userAPI}/buy-armoire`,
    {
      method: 'post',
      Headers
    }
  );

  const responseCode = response.getResponseCode();
  if (responseCode == 200) {
    const responseJson = JSON.parse(response);
    console.log(`Armoire json: ` + JSON.stringify(responseJson.data.armoire));
    console.log('Message:' + responseJson.message);
    return responseJson;
  } else {
    const errorData = JSON.parse(response);
    console.log('Error code: ' + errorData.error);
    console.log('Error message: ' + errorData.message);
  }

  return undefined;
}

/**
 * Get current user data
 */
function getUser() {
  const response = UrlFetchApp.fetch(
    userAPI,
    {
      method: 'get',
      Headers
    }
  );

  if (response.getResponseCode() == 200) {
    return JSON.parse(response);
  } else {
    const errorData = JSON.parse(response);
    console.log('Error code: ' + errorData.error);
    console.log('Error message: ' + errorData.message);
  }

  return undefined;
}

/**
 * Send a private message to a user
 */
function sendPM(targetUserId, textMessage) {
  if (targetUserId && textMessage) {
    console.log('sendPM: targetUserId: ' + targetUserId + '  \ntextMessage: ' + textMessage);
    const requestBody = {
      message: textMessage,
      toUserId: targetUserId
    };
    const response = UrlFetchApp.fetch(
      `${membersAPI}/send-private-message`,
      {
        method: 'post',
        Headers,
        contentType : 'application/json',
        payload : JSON.stringify(requestBody)
      }
    );
    if (response.getResponseCode() == 200) {
      console.log('PM sent successfully');
    } else {
      const errorData = JSON.parse(response);
      console.log('Error code: ' + errorData.error);
      console.log('Error message: ' + errorData.message);
    }
  }
}