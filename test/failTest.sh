x=0
while [ "$x" -eq "0" ]
do
npm run clean && mocha test/scripts/multi-instance-parallel-tests.js >run.log 2>&1
x=$?
echo "Return Status $x";
sleep 1
done;
