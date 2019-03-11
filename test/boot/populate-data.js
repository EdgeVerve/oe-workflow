module.exports = function populateData(app, done) {
  done();
  // var Customer = loopback.findModel('Customer');
  // Customer.destroyAll({}, { ignoreAutoScope : true }, function (err) {
  //   console.log(err);
  //   var item1 = {
  //     'name': 'Customer A',
  //     'age': 10
  //   };
  //   var item2 = {
  //     'name': 'Infosys Customer',
  //     'age': 20
  //   };
  //   var item3 = {
  //     'name': 'EV Customer',
  //     'age': 30
  //   };
  //   var item4 = {
  //     'name': 'BPO Customer',
  //     'age': 30
  //   };
  //   var item5 = {
  //     'name': 'BPO Customer A',
  //     'age': 30
  //   };
  //   Customer.create(item1, { ctx: { tenantId: "/default" } }, function (err, r) {
  //     Customer.create(item2, { ctx: { tenantId: "/default/infosys" } }, function (err, r) {
  //       Customer.create(item3, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, r) {
  //         Customer.create([item4, item5], { ctx: { tenantId: "/default/infosys/bpo" } }, function (err, r) {
  //           return done();
  //         });
  //       });
  //     });
  //   });
  // });
};

