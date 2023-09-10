/**
 * Author: Igromanru
 * Source: https://github.com/igromanru/My-Habitica-Scripts
 * Version: 0.1.2
 * Description: The script starts the quest automatically after X hours. 
 *              You have to be the Party Leader or Quest Owner to be able to start the quest before all members have accepted the invite.
 * Installation Guide:
 *  1. Fill USER_ID and API_TOKEN with your UserId and the ApiToken
 *  2. Deploy the script as WebApp
 *  3. Copy the WebApp URL into the WEB_APP_URL variable
 *  4. Run installAutoStartQuestTrigger(), then the createAutoStartQuestWebhooks() functions
 */
// ------------- Set Up ---------------------------------------
const USER_ID = "";
const API_TOKEN = "";
const WEB_APP_URL = "";
// --------- Configurations -----------------------------------
const AUTO_START_QUEST = true;
const AUTO_START_QUEST_AFTER_X_HOURS = 14;

// If you install the trigger, it will execute autoStartQuest each X hours
const TRIGGER_AUTO_START_QUEST_EACH_X_HOURS = 1;
// ------------------------------------------------------------
// --------- Code - Edit at your own responsibility -----------
const QUEST_ACTIVITY_WEBHOOK_NAME = `${DriveApp.getFileById(ScriptApp.getScriptId()).getName()}-Quest-Activity`;
const ScriptProperties = PropertiesService.getScriptProperties();
const Headers = {
  'x-api-user': USER_ID,
  'x-api-key': API_TOKEN,
};
const baseUrl = 'https://habitica.com/api';
const userAPI = baseUrl + '/v3/user';
const partyAPI = baseUrl + '/v3/groups/party';

/**
 * Main function. Can be executed manuelly or will be executed through the autoStartQuestTrigger function
 */
function autoStartQuest() {
  const questInvited = getQuestIvitedDateTime(); 
  if (questInvited && questInvited instanceof Date) {
    console.log(`Invited to the quest: ${getTimeDifferenceToNowAsString(questInvited)}`);
    const party = getParty();
    if (party && party.quest) {
      if (party.quest.key && !party.quest.active) {
        const startQuestAfterXHoursAsMs = AUTO_START_QUEST_AFTER_X_HOURS * 60 * 60 * 1000;
        if ((new Date() - questInvited) >= startQuestAfterXHoursAsMs) {
          if (forceStartQuest()) {
            console.log(`autoStartQuest: Quest started`);
          }
        }
      } else {
        deleteQuestIvitedDateTime();
        console.log(`autoStartQuest: Skipping, no quest or the quest is already active`);
      }
    }
  } else {
    console.error(`autoStartQuest: Last quest invited date time is unknown`);
  }
  
}

/**
 * Install scheduled triggers
 */
function installAutoStartQuestTrigger() {
  uninstallAutoStartQuestTrigger();
  console.log("Creating triggers...");

  const trigger = ScriptApp.newTrigger(autoStartQuestTrigger.name)
    .timeBased()
    .everyHours(TRIGGER_AUTO_START_QUEST_EACH_X_HOURS)
    .create();
  
  if (trigger) {
    console.log("Trigger created for: " + trigger.getHandlerFunction());
  }
}

/**
 * Uninstall scheduled triggers
 */
function uninstallAutoStartQuestTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length > 0) {
    console.log("Deleting triggers");

    for (const trigger of triggers) {
      const functionName = trigger.getHandlerFunction();
      if (functionName == autoStartQuestTrigger.name) {
        ScriptApp.deleteTrigger(trigger);
        console.log("Trigger deleted: " + functionName);
      }
    }
  }
}

function createAutoStartQuestWebhooks() {
  deleteAutoStartQuestWebhooks();
  console.log("Creating WebHooks...");

  if (WEB_APP_URL) {
    const options = {
      questInvited: true
    };
    createWebHook(WEB_APP_URL, QUEST_ACTIVITY_WEBHOOK_NAME, 'questActivity', options);
  } else {
    console.error(`createAutoStartQuestWebhooks: Can't create webhooks, the WEB_APP_URL isn't set`);
  }
}

function deleteAutoStartQuestWebhooks() {
  console.log("Deleting WebHooks...");

  const webHooks = getWebHooks();
  if (webHooks && webHooks.length > 0) {
    for (const webHook of webHooks) {
      if (webHook && webHook.id) {
        if (webHook.label == QUEST_ACTIVITY_WEBHOOK_NAME) {
          console.log(`Deleting WebHook: ${webHook.label}`);
          deleteWebHook(webHook.id);
        }
      }
    }
  } else {
    console.log(`No WebHooks found`);
  }
}

/**
 * Function to be used in timed trigger.  
 * The function is only needed if you want to be able to switch timed execution on/off without deleting the trigger.
 */
function autoStartQuestTrigger() {
  if (AUTO_START_QUEST) {
    autoStartQuest();
  }
}

function doPost(e) {
  const pojo = JSON.parse(e.postData.contents);
  if (pojo && pojo.webhookType === 'questActivity') {
    if (pojo.type === 'questInvited') {
      setQuestIvitedDateTime();
    }
  }
}

function getParty() {
  const response = UrlFetchApp.fetch(
    partyAPI,
    {
      method: 'get',
      headers: Headers,
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() < 300) {
    const result = JSON.parse(response.getContentText());
    if (result !== undefined && result && typeof result.data === 'object') {
      return result.data;
    }
    return JSON.parse(response);
  } else {
    const errorData = JSON.parse(response);
    console.log('Error code: ' + errorData.error);
    console.log('Error message: ' + errorData.message);
  }

  return undefined;
}

/**
 * Force start's the current party quest
 */
function forceStartQuest() {
  console.log('Force starting the quest...')

  const response = UrlFetchApp.fetch(
    `${partyAPI}/quests/force-start`,
    {
      method: 'post',
      headers: Headers,
      muteHttpExceptions: true
    }
  );

  const responseCode = response.getResponseCode();
  if (responseCode < 300) {
    const result = JSON.parse(response.getContentText());
    if (result !== undefined && result && typeof result.data === 'object') {
      return result.data;
    }
  } else {
    const errorData = JSON.parse(response);
    console.log('Error code: ' + errorData.error);
    console.log('Error message: ' + errorData.message);
  }

  return undefined;
}

/**
 * Creates a new WebHook
 * Returns the new WebHook object
 * See: https://habitica.com/apidoc/#api-Webhook-AddWebhook
 */
function createWebHook(targetUrl, label, type = 'taskActivity', options = undefined, enabled = true, id = '') {
  if (targetUrl && label && type) {
    console.log(`Creating WebHook: label: ${label}, type: ${type}, enabled: ${enabled}\nurl: ${targetUrl}`);
    let requestBody = {
      "enabled": enabled,
      "url": targetUrl,
      "label": label,
      "type": type
    };
    if (options) {
      requestBody = Object.assign(requestBody, {
        "options": options
      });
    }
    if (id) {
      requestBody = Object.assign(requestBody, {
        "id": id
      });
    }

    const response = UrlFetchApp.fetch(
      `${userAPI}/webhook`,
      {
        method: 'post',
        headers: Headers,
        muteHttpExceptions: true,
        contentType: 'application/json',
        payload: JSON.stringify(requestBody)
      }
    );
    const responseCode = response.getResponseCode();
    if (responseCode < 300) {
      const result = JSON.parse(response.getContentText());
      if (result !== undefined && result && typeof result.data === 'object') {
        return result.data;
      }
    } else {
      const errorData = JSON.parse(response);
      console.log('Error code: ' + errorData.error);
      console.log('Error message: ' + errorData.message);
    }
  }

  return undefined;
}

/**
 * Returns an array of user's webhooks
 */
function getWebHooks() {
  const response = UrlFetchApp.fetch(
    `${userAPI}/webhook`,
    {
      method: 'get',
      headers: Headers,
      muteHttpExceptions: true
    }
  );
  const responseCode = response.getResponseCode();
  if (responseCode < 300) {
    const result = JSON.parse(response.getContentText());
    if (result !== undefined && result && result.data instanceof Array) {
      return result.data;
    }
  } else {
    const errorData = JSON.parse(response);
    console.log('Error code: ' + errorData.error);
    console.log('Error message: ' + errorData.message);
  }
  
  return [];
}

/**
 * Deletes a WebHook
 * Returns an array of remaining webhooks as data
 */
function deleteWebHook(webhookId) {
  if (webhookId && typeof webhookId === 'string') {
    const response = UrlFetchApp.fetch(
      `${userAPI}/webhook/${webhookId}`,
      {
        method: 'delete',
        headers: Headers,
        muteHttpExceptions: true
      }
    );
    const responseCode = response.getResponseCode();
    if (responseCode < 300) {
      const result = JSON.parse(response.getContentText());
      if (result !== undefined && result && result.data instanceof Array) {
        return result.data;
      }
    } else {
      const errorData = JSON.parse(response);
      console.log('Error code: ' + errorData.error);
      console.log('Error message: ' + errorData.message);
    }
  }

  return [];
}

function setQuestIvitedDateTime(dateTime = new Date()) {
  ScriptProperties.setProperty("QUEST_INVITED_DATE_TIME", dateTime.toISOString());
}

function getQuestIvitedDateTime() {
  const value = ScriptProperties.getProperty("QUEST_INVITED_DATE_TIME");
  if (typeof value === 'string' && value) {
    return new Date(value);
  }
  return new Date();
}

function deleteQuestIvitedDateTime() {
  ScriptProperties.deleteProperty("QUEST_INVITED_DATE_TIME");
}

function getTimeDifferenceToNowAsString(dateTime) {
  let result = ``;
  if (dateTime && dateTime instanceof Date) {
    const now = new Date();
    const timeDifference = Math.abs(now - dateTime);

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));

    
    if (days > 0) {
      result += `${days}d`;
    }
    if (hours > 0) {
      if (result) {
        result += ' ';
      }
      result += `${hours}h`;
    }
    if (minutes > 0) {
      if (result) {
        result += ' ';
      }
      result += `${minutes}min`;
    }
  }
  return result;
}