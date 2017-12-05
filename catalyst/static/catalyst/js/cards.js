var app = new Vue({
    el: '#bookList',
    data: {
      books : books,
      test: false,
      filter: "",
      searchType: "Title",
      sortType: "Title",
      searchGrade: "Select grade level",
      gradeFilterMap: {'': 0,'Kindergarten': 1,'Grade 1':2,'Grade 2':3,'Grade 3':4,'Grade 4':5,'Grade 5':6,'Grade 6':7,'Grade 7':8,'Grade 8':9,'Grade 9':10,'Grade 10':11,'Grade 11':12,'Grade 12':13}
    },
    computed:{
        sortedArray: function() {
          return this.books.sort(this.compare);
        }
    },
    methods: {
     compare: function(a, b) {
            if(this.sortType == "Title"){
              if (a.title < b.title)
                return -1;
              if (a.title > b.title)
                return 1;
              return 0;
            }
            if(this.sortType == "Author"){
              if (a.sub_title < b.sub_title)
                return -1;
              if (a.sub_title > b.sub_title)
                return 1;
              return 0;
            }
            if(this.sortType == "Grade"){
              if (app.gradeFilterMap[a.reading_level] < app.gradeFilterMap[b.reading_level])
                return -1;
              if (app.gradeFilterMap[a.reading_level] > app.gradeFilterMap[b.reading_level])
                return 1;
              return 0;
            }
            if(this.sortType == "Lexile"){
              // if (a.lexile_level < b.lexile_level)
              //   return -1;
              // if (a.lexile_level > b.lexile_level)
              //   return 1;
              // return 0;
              var tempA = a.lexile_level;
              var tempB = b.lexile_level;
              if(a.lexile_level == ""){
                  tempA = -1;
              }
              if(b.lexile_level == ""){
                  tempB = -1;
              }
              return tempA - tempB;
            }
      },
      filterCards: function(){
        if(this.filter == "" /*&& this.searchGrade == "Select grade level"*/){
          return this.books;
        }
        // var gradeFilterBooks = this.books.filter(function(book){
        //     if(app.searchGrade == "Select grade level"){
        //       return book;
        //     }
        //     if(book.reading_level == app.searchGrade){
        //       return book;
        //     }
        // })
        //console.log(gradeFilterBooks);
        return this.books.filter(function(book){
            if(book.title.toLowerCase().indexOf(app.filter.toLowerCase()) != -1){
              return book;
            }
            if(book.sub_title.toLowerCase().indexOf(app.filter.toLowerCase()) != -1){
              return book;
            }
            if(book.lexile_level == app.filter){
              return book;
            }
            if(book.reading_level == app.filter){
              return book;
            }
        })
      },
    },
});
$(document).ready(function () {
  //console.log(books);
});