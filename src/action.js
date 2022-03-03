const core = require('@actions/core');
const github = require('@actions/github');
const jsonData= require('../moduleOwners.json');
const fs = require('fs');

const main = async () => {
  try {
    /**
     * We need to fetch all the inputs that were provided to our action
     * and store them in variables for us to use.
     **/
    const owner = core.getInput('owner', { required: true });
    const repo = core.getInput('repo', { required: true });
    const content = core.getInput('content', { required: true });
    const pr_number = github.context.issue.number;
    const token = core.getInput('token', { required: true });

    /**
     * Now we need to create an instance of Octokit which will use to call
     * GitHub's REST API endpoints.
     * We will pass the token as an argument to the constructor. This token
     * will be used to authenticate our requests.
     * You can find all the information about how to use Octokit here:
     * https://octokit.github.io/rest.js/v18
     **/
    const octokit = new github.getOctokit(token);

    /**
     * We need to fetch the list of files that were changes in the Pull Request
     * and store them in a variable.
     * We use octokit.paginate() to automatically loop over all the pages of the
     * results.
     * Reference: https://octokit.github.io/rest.js/v18#pulls-list-files
     */
    const { data: changedFiles } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pr_number,
    });

    console.log({changedFiles});
    /**
     * Contains the sum of all the additions, deletions, and changes
     * in all the files in the Pull Request.
     **/
    let diffData = {
      additions: 0,
      deletions: 0,
      changes: 0
    };

    // Reference for how to use Array.reduce():
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
    diffData = changedFiles.reduce((acc, file) => {
      acc.additions += file.additions;
      acc.deletions += file.deletions;
      acc.changes += file.changes;
      return acc;
    }, diffData);

    /**
     * Loop over all the files changed in the PR and add labels according 
     * to files types.
     **/
    let filesCountPerExtension = {js: 0, css: 0};
    let extensionFileRuleMsg = "";
     for (const file of changedFiles) {
        const fileExtension = file.filename.split('.').pop();
        if(fileExtension === "js") {
          filesCountPerExtension = {...filesCountPerExtension, js: filesCountPerExtension.js+1 };
        }
        if(fileExtension === "css") {
          filesCountPerExtension = {...filesCountPerExtension, css: filesCountPerExtension.css+1 };
        }
        if(fileExtension === "md") {
          filesCountPerExtension = {...filesCountPerExtension, md: filesCountPerExtension.md+1 };
        }
        if(filesCountPerExtension.js > 1) {
          extensionFileRuleMsg = `As ${filesCountPerExtension.js} number of js files are changed. We will strongly recommend to update the documentation.`
        }
     }
    // for (const file of changedFiles) {
    //   /**
    //    * Add labels according to file types.
    //    */
    //   const fileExtension = file.filename.split('.').pop();
    //   switch(fileExtension) {
    //     case 'md':
    //       await octokit.rest.issues.addLabels({
    //         owner,
    //         repo,
    //         issue_number: pr_number,
    //         labels: ['markdown'],
    //       });
    //     case 'js':
    //       await octokit.rest.issues.addLabels({
    //         owner,
    //         repo,
    //         issue_number: pr_number,
    //         labels: ['javascript'],
    //       });
    //     case 'yml':
    //       await octokit.rest.issues.addLabels({
    //         owner,
    //         repo,
    //         issue_number: pr_number,
    //         labels: ['yaml'],
    //       });
    //     case 'yaml':
    //       await octokit.rest.issues.addLabels({
    //         owner,
    //         repo,
    //         issue_number: pr_number,
    //         labels: ['yaml'],
    //       });
    //   }
    // }

    /**
     * Create a comment on the PR with the information we compiled from the
     * list of changed files.
     */
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr_number,
      body: `
        Content: ${String(content)}
        ${extensionFileRuleMsg}
        Owner: ${jsonData.basicModule.owner} ${jsonData.basicModule.ownerId} \n
        Documentation Link: ${jsonData.basicModule.confluenceLink} \n
        Pull Request #${pr_number} has been updated with: \n
        - ${diffData.changes} changes \n
        - ${diffData.additions} additions \n
        - ${diffData.deletions} deletions \n
      `
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

// Call the main function to run the action
main();