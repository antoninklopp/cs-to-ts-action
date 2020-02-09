ncc build src/main.ts
git add .
git tag -d v1
git push origin :refs/tags/v1
git commit -m "Deploying new version"
git tag -fa -m "Deploying new version" v1
git push --follow-tags