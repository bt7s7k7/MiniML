target_dir="release.local"
repository_url="git@github.com:bt7s7k7/MiniML.git"

if [ ! -d "$target_dir" ]; then
    git clone -b docs "$repository_url" "$target_dir"
else
    echo "Directory '$target_dir' already exists. Skipping clone."
fi

cd "$target_dir"
git pull
cd -

cp -r dist/* "$target_dir"
mv "$target_dir/index.html" "$target_dir/404.html"

cd "$target_dir"
git add .
git commit --amend --no-edit
git push --force
cd -
