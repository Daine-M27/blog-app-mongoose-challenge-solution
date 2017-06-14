const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');
const {DATABASE_URL} = require('../config');

chai.use(chaiHttp);

//adds data to blog posts
function seedBlogPostData() {
	console.info('seeding blog post data');
	const seedData = [];

	for (let i=1; i<=10; i++) {
		seedData.push(generateBlogPostData());
	}
  // this will return a promise
  return BlogPost.insertMany(seedData);
}


//used for input and request of blog data
function generateBlogPostData() {
	return {
		title: faker.lorem.sentence(),
		content: faker.lorem.text(),
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName(),
		}
	}
}


//deletes data from database after each test
function tearDownDb() {
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}




//testing section

describe('Blog Posts API resource', function() {

	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedBlogPostData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	})


  // describe('GET endpoint', function() {

  //   it('should return all existing posts', function() {
  //     // strategy:
  //     //    1. get back all posts returned by by GET request to `/posts`
  //     //    2. prove res has right status, data type
  //     //    3. prove the number of posts we got back is equal to number
  //     //       in db.
  //     let res;
  //     return chai.request(app)
  //       .get('/posts')
  //       .then(_res => {
  //         res = _res;
  //         res.should.have.status(200);
  //         // otherwise our db seeding didn't work
  //         res.body.should.have.length.of.at.least(1);

  //         return BlogPost.count();
  //       })
  //       .then(count => {
  //         // the number of returned posts should be same
  //         // as number of posts in DB
  //         res.body.should.have.length.of(count);
  //       });
  //   });


	describe('GET endpoint', function() {

		it('should return all existing blog posts', function() {
		  let res;
		  return chai.request(app)
			.get('/posts')
			.then(function(_res) {
          	// so subsequent .then blocks can access resp obj.
          	res = _res;
          	res.should.have.status(200);
          	// otherwise our db seeding didn't work
          	res.body.should.have.length.of.at.least(1);

          	return BlogPost.count();
      		})
			// .then(function(count) {
			// 	res.body.should.have.length.of(count);
			// });
		});


		it('should return posts with right fields', function() {
      // Strategy: Get back all posts, and ensure they have expected keys

      let resPost;
      return chai.request(app)
      .get('/posts')
      .then(function(res) {
      	res.should.have.status(200);
      	res.should.be.json;
      	res.body.should.be.a('array');
      	res.body.should.have.length.of.at.least(1);

      	res.body.forEach(function(post) {
      		post.should.be.a('object');
      		post.should.include.keys(
      			'title','content', 'author', 'id');
      	});
      	resPost = res.body[0];
      	return BlogPost.findById(resPost.id);
      })
      .then(function(post) {

      	resPost.id.should.equal(post.id);
      	resPost.title.should.equal(post.title);
      	resPost.content.should.equal(post.content);
      	resPost.author.should.equal(post.authorName);
      });
  });
	});

	describe('POST endpoint', function() {
		it('should add a new blog post', function() {

			const newPost = generateBlogPostData();

			return chai.request(app)
			.post('/posts')
			.send(newPost)
			.then(function(res) {
				res.should.have.status(201);
				res.should.be.json;
				res.body.should.be.a('object');
				res.body.should.include.keys(
					'id', 'title', 'content', 'author');
				res.body.title.should.equal(newPost.title);
          // cause Mongo should have created id on insertion
          res.body.id.should.not.be.null;
          res.body.content.should.equal(newPost.content);
          res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
          return BlogPost.findById(res.body.id).exec();
      })
			.then(function(post) {
				post.title.should.equal(newPost.title);
				post.content.should.equal(newPost.content);
				post.author.firstName.should.equal(newPost.author.firstName);
          		post.author.lastName.should.equal(newPost.author.lastName);
			});
		});
	});

	describe('PUT endpoint', function() {


		it('should update fields you send over', function() {
			const updateData = {
				title: 'fofofofofofofof',
				content: 'futuristic fusion',
				author: {firstName: 'newname', lastName: 'newlastname'}
			};

			return BlogPost
			.findOne()
			.exec()
			.then(function(post) {
				updateData.id = post.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai.request(app)
          .put(`/posts/${post.id}`)
          .send(updateData);
      })
			.then(function(res) {
				res.should.have.status(201);
				res.should.be.json;
				res.body.should.be.a('object');
				res.body.title.should.equal(updateData.title);
				res.body.content.should.equal(updateData.content);
				res.body.author.should.equal(`${updateData.author.firstName} ${updateData.author.lastName}`);



				return BlogPost.findById(updateData.id).exec();
			})
			.then(function(post) {
				post.title.should.equal(updateData.title);
				post.content.should.equal(updateData.content);
				post.author.firstName.should.equal(updateData.author.firstName);
          		post.author.lastName.should.equal(updateData.author.lastName);
			});
		});
	});

	describe('DELETE endpoint', function() {

		it('delete a blog post by id', function() {

			let post;

			return BlogPost
			.findOne()
			.exec()
			.then(function(_post) {
				post = _post;
				return chai.request(app).delete(`/posts/${post.id}`);
			})
			.then(function(res) {
				res.should.have.status(204);
				return BlogPost.findById(post.id).exec();
			})
			.then(function(_post) {

				should.not.exist(_post);
			});
		});
	});
});


















