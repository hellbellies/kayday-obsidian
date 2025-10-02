# Obsidian Kayday Plugin

My very opinionated version of a Todo application

## How to use

### Display Kayday

To show the Kayday Task List either

-   click the leaf icon in the left sidebar.
-   CMD+P (or CTRL+P on Windows / Linux) to show the command palette and run `Kayday: open`

### Creating a Task

Either

-   add a note and tag it with `kayday` (you can change the tag used to identify task inside Kayday's settings)
-   inside the Kayday Task List use the textfield to add a new task
    -   a new note will be added to the Folder you set in Kayday's settings (default is `Tasks`)
    -   the note will automatically be tagged with the tag used to recognize tasks

### Adding metadata to a task

Add properties by entering `---` + Enter at the top of the file.

The following properties are recognized

-   `context`(text) - e.g. 'home', 'work', 'shopping' ... you will be able to filter by context
-   `priority` (text) - `high`, `medium`, `low`
-   `days` (list) - the days the task should be displayed, e.g. `Mon, Tue, Fri`
-   `hours` (text) - the hours the task should be displayed, e.g. `8, 10` will only display the task between 08:00-08:59 and 10:00-10:59
-   `silencedUntil` (date) - the task will not show as open task until the entered data

All properties are optional or can be left empty.

### Completing a task

To complete (uncomplete) a task click on the Icon next to the task's title.

## Installation

This plugin is currently not in the official addon catalogue. To install it

-   clone this repo into `<vault_repository>/.obsidian/plugins`
-   navigate into the repo and run `npm run dev` or `npm run build`
-   then activate it in Obsidian

Alternatively you can install the BRAT plugin and install a release of Kayday using its Github address: `https://github.com/hellbellies/kayday-obsidian`

## Alfred workflow

There is also a simple Alfred Workflow. To use it

-   import the `Alfred Workflow.alfredworkflow` into Alfred
-   configure the workflow
    -   click on configure
    -   select the path to the folder in your vault where you want to put new tasks
    -   enter the tag Kayday uses to recognize tasks (default: `task`)
-   toggle alfred and type `kayday` followed by a space and the name of the task
