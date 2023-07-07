# OE Obsidian Plugin

This is a plugin for Obsidian (https://obsidian.md) created to sync the obsidian notes to the Only Ever application.

## Prerequisite

The prerequisite for this project are:

-   Obsidian application
-   node: 17

## Installation and Run

Please make sure you have obsidian installed in your system before you begin with the installation process:

-   Create an obsidian vault.
-   Open the folder where your obsidian vault is located. Open `.obsidian` folder, then open `plugins` folder.
-   Clone your repo to the `plugins` folder with the following command:
    ```
    git clone git@github.com:OnlyEver/onlyever_obsidian_sync.git
    ```
    OR
    ```
    git clone https://github.com/OnlyEver/onlyever_obsidian_sync.git
    ```
-   Run `npm install` to install node packages.
-   Run `npm run dev` to compile your plugin from `main.ts` to `main.js`.
-   Open your obsidian application. In the `community plugin` tab of `settings`, reload the installed plugin section to see the 'Obsidian-Onlyever-plugin'.
-   Turn on the toggle button for 'Obsidian-Onlyever-plugin'.
-   Obsidian plugin is now installed on your obsidian application and you may start syncing you notes.

## Using Obsidian Plugin

OE Obsidian Plugin syncs the obsidian note to the Only Ever application. To sync the note metatag `oe_sync: true` is to be added to the frontmatter of notes that you wish to sync. The tag can by either one of the following process:

-   Add the manually to front matter.
-   Add the tag through the `Mark to Sync` button present on the ribbon
-   Add tag using your predefined hotkeys.

Once the `oe_sync:true` metatag is added to the frontmatter, the notes will be synced during the following processes:

-   when the notes are explictly saved
-   when obsidian application is initially loaded
-   on clicking the `Sync Notes` button present in the ribbon
-   using the predefined hotkey for sync.

To define hot keys for the obsidian plugin, please visit the Hotkeys tab of the setting. Search for the HotKeys with name 'Obsidian-Onlyever-Plugin', then set desired hotkeys to `Mark for Sync` and `Sync Notes` functionalities.
