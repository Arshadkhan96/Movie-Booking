import { Calendar, Clock, Image as ImageIcon, Sparkle } from "lucide-react"
import { newsStyles, newsCSS } from "../assets/dummyStyles"
import { sampleNews } from "../assets/newdummydata"

const News = () => {
    return (
        <div className={newsStyles.container}>
            {/* Keep fonts the same — Monoton for logo, Roboto for body */}
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Roboto:wght@300;400;700&display=swap');`}</style>

            <header className={newsStyles.header}>
                <div className={newsStyles.headerFlex}>
                    <div className={newsStyles.logoContainer}>
                        <div className={newsStyles.logoText} style={{ fontFamily: "Monoton,cursive" }}>
                            CineNews
                        </div>
                        <div
                            className={newsStyles.logoSubtitle}
                            style={{ fontFamily: "Roboto, sans-serif" }}
                        >
                            Latest • Curated • Cinematic
                        </div>
                    </div>

                    <div className={newsStyles.headerButtons}>
                        <button className={newsStyles.latestNewsButton}>
                            <ImageIcon size={16} />
                            <span className={newsStyles.buttonText}>Latest News</span>
                        </button>
                    </div>
                </div>

                <div className={newsStyles.heroStrip}>
                    <div className={newsStyles.featuredBadge}>Featured </div>

                    <div className={newsStyles.stripeText}>
                        {sampleNews[0].title} -- {sampleNews[0].excerpt}
                    </div>

                    <div className={newsStyles.stripeIcon}>
                        <Sparkle size={16} className="text-red-500" />
                    </div>
                </div>
            </header>

            <main className={newsStyles.main}>
                <section className={newsStyles.grid}>
                    <article className={newsStyles.heroCard}>
                        <div className={newsStyles.heroImageContainer}>
                            <div className={newsStyles.heroImage}>
                                <img src={sampleNews[0].image} alt={sampleNews[0].title}
                                    className={newsStyles.heroImage}
                                    loading="eager" />
                                <div className={newsStyles.heroOverlay}></div>

                                <div className={newsStyles.heroContent}>
                                    <span className={newsStyles.heroCategory}>
                                        {sampleNews[0].category}
                                    </span>
                                    <h1 className={newsStyles.heroTitle} style={{
                                        fontFamily: "Roboto, sans-serif"
                                    }}>
                                        {sampleNews[0].title}
                                    </h1>
                                    <p className={newsStyles.heroExcerpt}>
                                        {sampleNews[0].excerpt}
                                    </p>

                                    <div className={newsStyles.heroMeta}>
                                        <div className={newsStyles.metaItem}>
                                            <Clock size={16} />
                                            <span className={newsStyles.metaText}>
                                                {sampleNews[0].time}
                                            </span>
                                        </div>

                                        <div className={newsStyles.metaItem}>
                                            <Calendar size={16} />
                                            <span className={newsStyles.metaText}>
                                                {sampleNews[0].date}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={newsStyles.heroStrip}>
                            <div className={newsStyles.stripGrid}>
                                {sampleNews.slice(1, 4).map((item) => (
                                    <article key={item.id} className={newsStyles.articleCard}>
                                        <div className={newsStyles.articleImage}>
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className={newsStyles.articleImage}
                                                loading="lazy"
                                            />
                                            <div className="absolute left-3 bottom-3">
                                                <span className={newsStyles.articleCategory}>
                                                    {item.category}
                                                </span>
                                            </div>
                                     </div>

                                        <div className={newsStyles.articleContent}>
                                            <div>
                                                <h3 className={newsStyles.articleTitle}
                                                    style={{
                                                        fontFamily: "Roboto, sans-serif"
                                                    }}>
                                                    {item.title}
                                                </h3>
                                                <p className={newsStyles.articleExcerpt}>
                                                    {item.excerpt}
                                                </p>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </article>

                    {/* Right column: animated card stack */}
                    <aside className={newsStyles.sidebar}>
                        {sampleNews.slice(4, 7).map((item) => (
                            <div
                                key={item.id}
                                className={newsStyles.sidebarCard}
                            >
                                <div className={newsStyles.sidebarCardInner}>
                                    <div className={newsStyles.sidebarImage}>
                                        <img src={item.image} alt={item.title} className={newsStyles.sidebarImg} loading="lazy" />
                                    </div>

                                    <div className={newsStyles.sidebarContent}>
                                        <div className="flex items-start gap-2">
                                            <span className={newsStyles.sidebarCategory}>{item.category}</span>
                                        </div>

                                        <h4 className={newsStyles.sidebarTitle} style={{ fontFamily: "Roboto, sans-serif" }}>{item.title}</h4>
                                        <p className={newsStyles.sidebarExcerpt}>{item.excerpt}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* CTA / Subscribe card */}
                        <div className={newsStyles.subscribeCard}>
                            <h5 className={newsStyles.subscribeTitle} style={{ fontFamily: "Roboto, sans-serif" }}>Join CineNews</h5>
                            <p className={newsStyles.subscribeText}>Get curated cinematic news, exclusive behind-the-scenes, and early access to trailers.</p>
                            <div className={newsStyles.subscribeForm}>
                                <input
                                    className={newsStyles.subscribeInput}
                                    type="email"
                                    placeholder="Email address"
                                    required  
                                />
                                <button className={newsStyles.subscribeButton}>
                                    Subscribe
                                </button>
                            </div>
                        </div>
                    </aside>
                </section>
            </main>
            <style jsx>{newsCSS}</style>
        </div>
    )
}

export default News

