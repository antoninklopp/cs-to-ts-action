
## Github action to check if c# models and ts interfaces match

This github action allows you to check if your C# and your ts models are synchronized. 

## Example project

https://github.com/antoninklopp/cs-to-ts-action-example is an example project where you can find a complete set up of this action

## Set up

Add the action to your repo and you should have a file named cs-to-ts.yml that appears under the .github/workflows folder and should look like

``` yml
name: cs-to-ts
on: [pull_request]

jobs:
  label:

    runs-on: ubuntu-latest

    steps:
    - uses: antoninklopp/cs-to-ts-action@v1
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

Add a configuration file named cs-to-ts.yml to the .github folder with the paths to your c# and ts models:

``` yml
cs: 
  - models/cs/*

ts:
  - models/ts/*
```

## What does the action do? 

Every time you change a the c# or the ts models, a bot will comment your PR and tell you if the models are synchronized.  
**Warning** : The paths corresponding to the files should be exactly the same for cs and ts. 

Example : If the c# file is under path_cs/model/class.cs, the corresponding ts file should be path_ts/model/class.ts

## CSharp2ts

The code to "translate" c# files to ts files was copied from here https://github.com/RafaelSalguero/CSharp2TS because it does not offer an npm package to the best of my knowledge. 
Huge thanks for the code. 