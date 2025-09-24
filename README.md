# Obsidian Kayday Plugin

My very opinionated version of a Todo application

## How to use

Create a folder named 'Kayday'.

Any note you add to that folder is considered a task.

Add properties by entering `---` + Enter at the top of the file.

The following properties are recognized

-   `context`(text) - e.g. 'home', 'work', 'shopping' ... you will be able to filter by context
-   `priority` (text) - `high`, `medium`, `low`
-   `days` (text) - the days the task should be displayed, e.g. `Mon, Tue, Fri`
-   `hours` (text) - the hours the task should be displayed, e.g. `8, 10` will only display the task between 08:00-08:59 and 10:00-10:59
-   `silencedUntil` (date) - the task will not show as open task until the entered data

All properties are optional or can be left empty.

To show the Kayday Todo List either

-   click the leaf icon in the left sidebar.
-   CMD+P (or CTRL+P on Windows / Linux) to show the command palette and run `Kayday: open`

To complete (uncomplete) a task click on the Icon next to the task's title.

## Installation

This plugin is currently not in the official addon catalogue. To install it

-   clone this repo into `<vault_repository>/.obsidian/plugins`
-   navigate into the repo and run `pnpm build`
-   then activate it in Obsidian

Alternatively you can install the BRAT plugin and install a release of Kayday using its Github address: `https://github.com/hellbellies/kayday-obsidian`
