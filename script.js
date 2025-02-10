const cardsContainer = document.getElementById('cards-container');
const loadingIndicator = document.getElementById('loading-indicator');
const languageSelect = document.getElementById('language'); // Получаем элемент <select>
let currentCardIndex = 0;
let articles = [];
let isLoading = false;


async function fetchRandomArticles(count = 5) {
    if (isLoading) return;
    isLoading = true;
   // loadingIndicator.style.display = "block"; Убираем

    const language = languageSelect.value; // Получаем выбранный язык
    const apiUrl = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=${count}&origin=*`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.query && data.query.random) {
            const newArticles = [];
            let skipped = 0;
            const maxSkipped = 5;

            for (const randomPage of data.query.random) {
                const article = await fetchArticleContent(randomPage.id, language); // Передаем язык
                if (article && article.thumbnail) {
                    newArticles.push(article);
                    skipped = 0;
                } else {
                    skipped++;
                    if(skipped >= maxSkipped){
                      if(article){
                        newArticles.push(article);
                      }
                       skipped = 0;
                    }

                }
            }
            articles = articles.concat(newArticles);
            newArticles.forEach(displayArticle);
        }
         updateCardVisibility();

    } catch (error) {
        console.error('Ошибка:', error);
        displayError(`Не удалось загрузить статьи на языке ${language}. Попробуйте выбрать другой язык или обновить страницу.`);
    } finally {
        //loadingIndicator.style.display = "none";  Убираем
        isLoading = false;
    }
}
async function fetchArticleContent(pageId, language) { // Добавляем параметр language
  const apiUrl = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages|images&pageids=${pageId}&exintro&explaintext&piprop=thumbnail&pithumbsize=1920&imlimit=500&origin=*`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const page = data.query.pages[pageId];

        if (page && page.extract) {
             let imageUrl = null;
            if (page.thumbnail) {
                imageUrl = page.thumbnail.source;
            } else if (page.images && page.images.length > 0) {
              //Ищем картинку, проверяем, что она не служебная
              for(const img of page.images){
                const title = img.title;
                if(
                  !title.toLowerCase().includes(".svg") &&
                  !title.toLowerCase().includes("disambiguation") &&
                  !title.toLowerCase().includes("increase2.svg") &&
                  !title.toLowerCase().includes("decrease2.svg") &&
                  !title.toLowerCase().includes("increase_green.svg")
                ){
                    const imageInfoUrl = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=${title}&origin=*`;
                    const imageInfoResponse = await fetch(imageInfoUrl);
                    const imageInfoData = await imageInfoResponse.json();

                    const imageInfoPage = Object.values(imageInfoData.query.pages)[0];
                     if (imageInfoPage.imageinfo && imageInfoPage.imageinfo[0] && imageInfoPage.imageinfo[0].url) {
                        imageUrl = imageInfoPage.imageinfo[0].url;
                        break; // Нашли подходящее изображение, выходим из цикла
                     }
                }
              }

            }
            const maxTextLength = 1000; // Максимальная длина текста
            let extract = page.extract;
             if (extract.length > maxTextLength) {
                extract = extract.substring(0, maxTextLength) + "..."; // Обрезаем и добавляем многоточие
            }
            extract = addLineBreaks(extract); // Добавляем переносы строк

            return {
                title: page.title,
                extract: extract, // Используем обрезанный текст
                thumbnail: imageUrl,
                pageid: pageId,
            };
        } else {
           return null;
        }

    } catch (error) {
        console.error('Ошибка при получении данных статьи:', error);
        return null;
    }
}

function addLineBreaks(text) {
    //  Эвристика: добавляем перенос строки после точки, если следующий символ - заглавная буква или цифра.
      return text.replace(/\.([A-ZА-ЯЁ0-9])/g, '.\n$1').replace(/\n+/g, '\n'); //Убираем лишние переносы
  }

function displayArticle(article) {
    const card = document.createElement('div');
    card.classList.add('card');

    if (article.thumbnail) {
        card.style.backgroundImage = `url(${article.thumbnail})`;
    } else {
         card.style.backgroundColor = "#666";
    }
    const cardContent = document.createElement('div');
    cardContent.classList.add('card-content');

    const title = document.createElement('h2');
    title.textContent = article.title;
    cardContent.appendChild(title);

    const extract = document.createElement('p');
    extract.textContent = article.extract;
    cardContent.appendChild(extract);

    const link = document.createElement('a');
    const language = languageSelect.value;
    // ИЗМЕНЕНИЕ: Используем title вместо pageid
    link.href = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(article.title)}`; //  encodeURIComponent
    link.textContent = 'Читать полностью';
    link.target = '_blank';
    cardContent.appendChild(link);

     card.appendChild(cardContent);
    cardsContainer.appendChild(card);
}

function displayError(message) {
    let errorElement = document.querySelector('.error-message');

    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.classList.add('error-message');
      cardsContainer.appendChild(errorElement); // Добавляем в контейнер
    }
    errorElement.textContent = message;
}
function updateCardVisibility() {
  const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.classList.remove('prev', 'next', 'active');
        card.style.transform = '';
        card.style.display = 'none';

        if (index === currentCardIndex) {
            card.classList.add('active');
            card.style.display = 'flex';
        }
    });
    //Показываем следующую и предыдущую
    if(currentCardIndex > 0){
        cards[currentCardIndex - 1].style.display = 'block';
        cards[currentCardIndex - 1].classList.add('prev');

    }
    if(currentCardIndex < cards.length -1){
        cards[currentCardIndex + 1].style.display = 'block';
        cards[currentCardIndex + 1].classList.add('next');
    }

    if (currentCardIndex > articles.length - 3 && !isLoading) {
        fetchRandomArticles();
    }
}

function initHammer() {
    const container = document.getElementById('container');
    const mc = new Hammer(container);
    mc.get('swipe').set({ direction: Hammer.DIRECTION_VERTICAL });

    mc.on("swipeup", () => {
        if (currentCardIndex < articles.length - 1) {
            currentCardIndex++;
            setTimeout(updateCardVisibility, 300);
        }
    });

    mc.on("swipedown", () => {
        if (currentCardIndex > 0) {
            currentCardIndex--;
            setTimeout(updateCardVisibility, 300);
        }
    });
      container.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (event.deltaY > 0) {
           if (currentCardIndex < articles.length - 1) {
                currentCardIndex++;
                setTimeout(updateCardVisibility, 300);
            } else {
                fetchRandomArticles().then(() => {
                   if(articles.length > 0){
                       currentCardIndex++;
                      updateCardVisibility();
                   }
                });
            }
        } else {
            if (currentCardIndex > 0) {
               currentCardIndex--;
               setTimeout(updateCardVisibility, 300);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadingIndicator.style.display = "block";

    // --- Определение языка пользователя ---
    let userLanguage = navigator.language || navigator.userLanguage; // Получаем язык
    if (userLanguage) {
        userLanguage = userLanguage.toLowerCase(); // Приводим к нижнему регистру
        // Выбираем только первые два символа (код языка)
        if(userLanguage.includes("-")){
          userLanguage = userLanguage.split('-')[0];
        }

        // Проверяем, есть ли такой язык в нашем списке:
        const optionToSelect = languageSelect.querySelector(`option[value="${userLanguage}"]`);
        if (optionToSelect) {
            optionToSelect.selected = true; // Устанавливаем selected
        }
    }
    // --- Конец определения языка ---

    fetchRandomArticles().then(() => {
        updateCardVisibility();
        initHammer();
        loadingIndicator.style.display = "none";
    });

    languageSelect.addEventListener('change', () => {
        articles = [];
        currentCardIndex = 0;
        cardsContainer.innerHTML = '';
        fetchRandomArticles();
    });
});

//  Модальное окно "О проекте"
const modal = document.getElementById("about-modal");
const btn = document.getElementById("about-btn");
const span = document.getElementsByClassName("close-btn")[0];

//  Открыть модальное окно при клике на кнопку
btn.onclick = function() {
    modal.style.display = "block";
}

//  Закрыть модальное окно при клике на крестик
span.onclick = function() {
    modal.style.display = "none";
}

//  Закрыть модальное окно при клике вне его
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}