var express = require('express')
var router = express.Router()
var passport = require('passport')

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {title: 'BlackJackOn'})
})

router.post('/login', passport.authenticate('login', {failureRedirect: '/'}),
  // 인증 실패 시 401 리턴, {} -> 인증 스트레티지
  function (req, res) { // login 성공할 경우
    // res.redirect('/users'); // redirect 안함
  }
)

router.post('/signup', passport.authenticate('signup', {
  successRedirect: '/users',
  failureRedirect: '/' //가입 실패시 redirect할 url주소
}))
router.get('/logout', function (req, res) {
  req.logout()
  res.redirect('/')
})

module.exports = router