/**
 * Author: Igromanru
 * Source: https://github.com/igromanru/My-Habitica-Scripts
 * Version: 0.2.0
 * Description: The script starts the quest automatically after X hours. 
 *              You have to be the Party Leader or Quest Owner to be able to start the quest before all members have accepted the invite.
 * Dependencies: Igromanru's Habitica Library (https://github.com/igromanru/Igromanrus-Habitica-Library)
 * 
 * Installation Guide:
 *  1. Follow the README of the Igromanru's Habitica Library (https://github.com/igromanru/Igromanrus-Habitica-Library) to add the library to the project
 *  2. Fill USER_ID and API_TOKEN with your UserId and the ApiToken
 *  3. Deploy the script as WebApp
 *  4. Copy the WebApp URL into the WEB_APP_URL variable
 *  5. Run the installAutoStartQuest() function
 * Update Guide
 *  1. To update the script, first execute the uninstallAutoStartQuest() function
 *  2. Select the part that you want to replace or the whole script and replace with the new version
 *  3. Fill USER_ID and API_TOKEN with your UserId and the ApiToken
 *  4. Open "Deploy"->"Manage deployments", in the top right corner click on "Edit". 
 *     Under "Version" select "New Version", give it a new Description and click "Deploy".
 *     (This way you will redeploy new code, but you will keep the old WebApp URL)
 *     If the "WEB_APP_URL" variable is empty, copy the WebApp URL from the new deployment in there.
 *  4. Run installAutoStartQuest() to setup the new version of the script
 */
// ------------- Set Up ---------------------------------------
const USER_ID = "";
const API_TOKEN = "";
const WEB_APP_URL = "";
// --------- Configurations -----------------------------------
const AUTO_START_QUEST = true;
const AUTO_START_QUEST_AFTER_X_HOURS = 14;
const AUTO_START_IF_INACTIVE_MEMBERS_LEFT = true;
const AUTO_START_IF_INACTIVE_MEMBERS_LEFT_AXTER_X_HOURS = 6;

// When a member should be considered inactive
const MEMBERS_INACTIVE_AFTER_X_DAYS = 2; 
const AND_MEMBERS_INACTIVE_AFTER_X_HOURS = 0;

// If you install the trigger, it will execute autoStartQuest each X hours
const TRIGGER_AUTO_START_QUEST_EACH_X_HOURS = 1;
// ------------------------------------------------------------
// --------- Code - Edit at your own responsibility -----------
const QUEST_ACTIVITY_WEBHOOK_NAME = `${DriveApp.getFileById(ScriptApp.getScriptId()).getName()}-Quest-Activity`;
const ScriptProperties = PropertiesService.getScriptProperties();

// Initialize the Habitica Library
Habitica.initialize(USER_ID, API_TOKEN, ScriptProperties);

/**
 * Main function. Can be executed manuelly or will be executed through the autoStartQuestTrigger function
 */
function autoStartQuest() {
  const questInvited = getQuestIvitedDateTime(); 
  if (questInvited && questInvited instanceof Date) {
    console.log(`Invited to the quest: ${JSON.stringify(Habitica.getTimeDifferenceToNow(questInvited))}`);
    const party = Habitica.getParty();
    if (party && party.quest) {
      if (party.quest.key && !party.quest.active) {
        const startQuestAfterXHoursAsMs = AUTO_START_QUEST_AFTER_X_HOURS * 60 * 60 * 1000;
        const startQuestIfInactiveMembersLeftAfterXHoursAsMs = AUTO_START_IF_INACTIVE_MEMBERS_LEFT_AXTER_X_HOURS * 60 * 60 * 1000;
        const questInvitedDiff = new Date() - questInvited;
        console.log(`The quest will be started after ${AUTO_START_QUEST_AFTER_X_HOURS} hour(s)`);
        let onlyInactiveMembersLeft = false;
        if (AUTO_START_IF_INACTIVE_MEMBERS_LEFT && questInvitedDiff >= startQuestIfInactiveMembersLeftAfterXHoursAsMs) {
          console.log(`Or after ${AUTO_START_IF_INACTIVE_MEMBERS_LEFT_AXTER_X_HOURS} hour(s) if only inactive members haven't accpted it`);
          onlyInactiveMembersLeft = checkIfOnlyInactiveMembersLeft();
          console.log(`autoStartQuest: onlyInactiveMembersLeft: ${onlyInactiveMembersLeft}`);
        }
        if (questInvitedDiff >= startQuestAfterXHoursAsMs || onlyInactiveMembersLeft) {
          if (Habitica.forceStartQuest()) {
            deleteQuestIvitedDateTime();
            console.info(`autoStartQuest: Quest started`);
          }
        }
      } else {
        deleteQuestIvitedDateTime();
        console.info(`autoStartQuest: Skipping, no quest or the quest is already active`);
      }
    }
  } else {
    console.error(`autoStartQuest: Last quest invited date time is unknown`);
  }
}

/**
 * Installs triggers and WebHooks
 */
function installAutoStartQuest() {
  createAutoStartQuestTriggers();
  createAutoStartQuestWebhooks();
}

/**
 * Uninstalls triggers and WebHooks
 */
function uninstallAutoStartQuest() {
  deleteAutoStartQuestTriggers();
  deleteAutoStartQuestWebhooks();
}

function createAutoStartQuestTriggers() {
  deleteAutoStartQuestTriggers();
  console.log("Creating triggers...");

  let trigger = ScriptApp.newTrigger(autoStartQuestTrigger.name)
    .timeBased()
    .everyHours(TRIGGER_AUTO_START_QUEST_EACH_X_HOURS)
    .create();
  
  if (trigger) {
    console.log("Trigger created for: " + trigger.getHandlerFunction());
  }

  trigger = ScriptApp.newTrigger(createAutoStartQuestWebhooks.name)
    .timeBased()
    .everyDays(2)
    .create();
  
  if (trigger) {
    console.log("Trigger created for: " + trigger.getHandlerFunction());
  }
}

function deleteAutoStartQuestTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length > 0) {
    console.log("Deleting triggers");

    for (const trigger of triggers) {
      const functionName = trigger.getHandlerFunction();
      if (functionName == autoStartQuestTrigger.name
          || functionName == createAutoStartQuestWebhooks.name) {
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
    Habitica.createWebHook(WEB_APP_URL, QUEST_ACTIVITY_WEBHOOK_NAME, 'questActivity', options);
  } else {
    console.error(`createAutoStartQuestWebhooks: Can't create webhooks, the WEB_APP_URL isn't set`);
  }
}

function deleteAutoStartQuestWebhooks() {
  console.log("Deleting WebHooks...");

  const webHooks = Habitica.getWebHooks();
  if (webHooks && webHooks.length > 0) {
    for (const webHook of webHooks) {
      if (webHook && webHook.id) {
        if (webHook.label == QUEST_ACTIVITY_WEBHOOK_NAME) {
          console.log(`Deleting WebHook: ${webHook.label}`);
          Habitica.deleteWebHook(webHook.id);
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

function checkIfOnlyInactiveMembersLeft() {
  const partyMembers = Habitica.getPartyMembers(true);
  if (partyMembers && partyMembers.length > 0) {
    for (const member of partyMembers) {
      if (member && member.party._id && member.party.quest.key && member.party.quest.RSVPNeeded === true) {
        const lastCheckin = new Date(member.auth.timestamps.loggedin);
        const timeDifference = Habitica.getTimeDifferenceToNow(lastCheckin);
        if (!timeDifference) {
          console.error(`checkIfOnlyInactiveMembersLeft: Member: ${member.profile.name}\ntimeDifference: ${JSON.stringify(timeDifference)}`);
          continue;
        }

        // Check if member is active
        if (!member.preferences.sleep && !(timeDifference.days >= MEMBERS_INACTIVE_AFTER_X_DAYS && timeDifference.hours >= AND_MEMBERS_INACTIVE_AFTER_X_HOURS)) {
          return false;
        }
      }
    }
    return true;
  }
  return false;
}

function setQuestIvitedDateTime(dateTime = new Date()) {
  ScriptProperties.setProperty("QUEST_INVITED_DATE_TIME", dateTime.toISOString());
}

function getQuestIvitedDateTime() {
  const value = ScriptProperties.getProperty("QUEST_INVITED_DATE_TIME");
  if (typeof value === 'string' && value) {
    return new Date(value);
  }
  console.warn(`getQuestIvitedDateTime: QuestIvitedDateTime isn't set!`)
  return new Date();
}

function deleteQuestIvitedDateTime() {
  ScriptProperties.deleteProperty("QUEST_INVITED_DATE_TIME");
}