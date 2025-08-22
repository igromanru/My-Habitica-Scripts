/**
 * Author: Igromanru
 * Source: https://github.com/igromanru/My-Habitica-Scripts
 * Version: 0.1.0
 * Last Updated: 22.08.2025
 * Description: The script automatically tries to accepts any quest invite
 * Dependencies: Igromanru's Habitica Library (https://github.com/igromanru/Igromanrus-Habitica-Library)
 * 
 * Installation Guide:
 *  1. Navigate to the "Overview" tab of the script and click the "Make a copy" button in the top-right corner of the screen
 *  2. Fill USER_ID and API_TOKEN with your UserId and the ApiToken
 *  3. Run the installAutoAcceptQuest() function (Give Google all the permissions it asks for)
 * Update Guide
 *  1. To update the script, first execute the uninstallAutoAcceptQuest() function
 *  2. Select the part that you want to replace or the whole script and replace with the new version
 *  3. Fill USER_ID and API_TOKEN with your UserId and the ApiToken
 *  4. Run installAutoStartQuest() to setup the new version of the script
 */
// ------------- Set Up ---------------------------------------
const USER_ID = "";
const API_TOKEN = "";
// --------- Configurations -----------------------------------
const AUTO_START_QUEST = true;
const AUTO_ACCEPT_QUEST_EACH_X_MINUTES = 30; // Must be: 1, 5, 10, 15 or 30

// ------------------------------------------------------------
// --------- Code - Edit at your own responsibility -----------
const ScriptProperties = PropertiesService.getScriptProperties();

// Initialize the Habitica Library
Habitica.initialize(USER_ID, API_TOKEN, ScriptProperties);

/**
 * Installs triggers and WebHooks
 */
function installAutoAcceptQuest() {
  uninstallAutoAcceptQuest();
  console.log("Creating triggers...");

  let trigger = ScriptApp.newTrigger(autoAcceptQuestTrigger_.name)
    .timeBased()
    .everyMinutes(AUTO_ACCEPT_QUEST_EACH_X_MINUTES)
    .create();
  
  if (trigger) {
    console.log("Trigger created for: " + trigger.getHandlerFunction());
  }
}

/**
 * Uninstalls triggers and WebHooks
 */
function uninstallAutoAcceptQuest() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length > 0) {
    console.log("Deleting all triggers");

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

/**
 * Time based trigger function to automatically accept quests
 */
function autoAcceptQuestTrigger_() {
  if (Habitica.acceptQuest()) {
    console.log("Quest invite was accepted");
  } else {
    console.log("No quest invitation found or already accepted");
  }
}