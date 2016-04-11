'use strict';

function Context(req, res) {
  this.req = this.request = req;
  this.res = this.response = res;
}

Context.prototype.applyDelegates = function() {

};

Context.prototype.buildArgs = function() {

};
