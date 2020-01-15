let it = {};
let app = angular.module('app', ['ngMaterial','ngRoute'])
.config(function($routeProvider, $locationProvider, $controllerProvider, $compileProvider, $mdThemingProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|sms|tel):/);
	$locationProvider.hashPrefix('');
    
    $routeProvider
        .when('/:view', {
            template: ' ',
            reloadOnSearch: false
        })
        .otherwise({
            redirectTo: '/main'
        });
    
    $mdThemingProvider.theme('default')
        .primaryPalette('blue')
        .accentPalette('light-green');
})
.controller('DashboardCtrl', function($scope, $http, $mdDialog, $mdToast, $routeParams, $sce, Fire){
    it.DashboardCtrl = $scope;
    it.Fire = Fire;
    $scope.params = $routeParams;
    let tools = $scope.tools = {
        init: ()=>{
            tools.render();
            // $scope.template = 'https://a.alphabetize.us/project/present/component/loading'
            // let {groupId, projectId} = $location.search();
            // $http.post('https://a.alphabetize.us/project/present/cloud/results', {
            //     groupId, projectId
            // }).then(r=>{
            //     $scope.project = r.data;
            //     $scope.template = `https://a.alphabetize.us/project/code/cloud/code?gid=${groupId}&pid=present&cid=template`;
            // }).catch(e=>{
            //     console.log(e);
            //     tools.alert('Data could not be loaded.')
            // })
        },
        view: ()=>{
            return `https://a.alphabetize.us/project/code/cloud/code?gid=iZTQIVnPzPW7b2CzNUmO&pid=LIJGdBKzktXHntCWjoln&cid=${$routeParams.view}.html`;
        },
        render: ()=>{
            $http.get(`https://a.alphabetize.us/project/code/cloud/code?gid=iZTQIVnPzPW7b2CzNUmO&pid=LIJGdBKzktXHntCWjoln&cid=${$routeParams.view}.js`)
            .then(r=>{
                let js = r.data;
                eval('js = $scope.js = '+js)
                if(js.init)
                    js.init();
            })
        },
        alert: function(message){
            $mdToast.show(
            $mdToast.simple()
                .textContent(message)
                .hideDelay(5000)
            );
        },
        dialog: function(dialog, params){
            if(dialog.indexOf('http') != -1)
                dialog = $sce.trustAsResourceUrl(dialog);
            else
                dialog = tools.component.get(dialog);
            params = Object.assign({
                scope: $scope,
                preserveScope: true,
                templateUrl: dialog,
                multiple: true,
                parent: angular.element(document.body),
                clickOutsideToClose: true
            }, params)
            $mdDialog.show(params)
        },
        copy: function(txtToCopy, notice){
            return new Promise((res,rej)=>{
                var body = angular.element(document.body);
                var textarea = angular.element('<textarea/>');
                textarea.css({
                    position: 'fixed',
                    opacity: '0'
                });
                textarea.val(txtToCopy);
                body.append(textarea);
                textarea[0].select();
                var successful = document.execCommand('copy');
                if(successful)
                    res()
                else
                    rej()
            })
        }
    }
    tools.init();
});

var whoisConfig = {
    apiKey: "AIzaSyD_3nGYh1GA2Ucds20nm8ad8HsuHFXRxbg",
    authDomain: "atfiliate.firebaseapp.com",
    databaseURL: "https://atfiliate.firebaseio.com",
    projectId: "atfiliate",
    storageBucket: "atfiliate.appspot.com",
    messagingSenderId: "126442541687",
    appId: "1:126442541687:web:1819721adcc2b9fe24ec72"
}
// var whois = firebase.initializeApp(whoisConfig, "whois");
var whois = firebase.initializeApp(whoisConfig);
angular.element(function() {
    angular.bootstrap(document, ['app']);
});