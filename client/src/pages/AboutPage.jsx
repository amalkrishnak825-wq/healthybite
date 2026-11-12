import { useEffect } from "react";
import { ArrowRight, Heart, Leaf, CookingPot, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import greenGoddessBowl from "../assets/meal-menu/green-goddess-bowl.png";
import quinoaPowerBowl from "../assets/meal-menu/quinoa-power-bowl.png";
import mediterraneanSalad from "../assets/meal-menu/mediterranean-salad.png";
import "../styles/About.css";

const values = [
  {
    icon: Leaf,
    title: "Good ingredients",
    description: "Thoughtful meals made with fresh ingredients and clear details.",
  },
  {
    icon: CookingPot,
    title: "Made with care",
    description: "A menu of satisfying meals prepared to fit into your everyday routine.",
  },
  {
    icon: Heart,
    title: "Food that feels good",
    description: "Options to help make choosing a meal feel simple and enjoyable.",
  },
];

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="home-page about-page">
      <Header />
      <main>
        <section className="about-hero">
          <div className="about-hero-copy">
            <span className="home-section-label"><Sprout size={14} /> A LITTLE ABOUT US</span>
            <h1>Good food.<br /><em>Better everyday.</em></h1>
            <p>HealthyBite makes it easier to find meals that feel fresh, taste delicious, and fit your day. We bring wholesome choices and convenient ordering together in one place.</p>
            <Link className="home-primary" to="/products">Explore our meals <ArrowRight size={16} /></Link>
          </div>
          <div className="about-hero-visual">
            <img className="about-hero-main-image" src={greenGoddessBowl} alt="A fresh green goddess bowl" />
            <img className="about-hero-small-image" src={mediterraneanSalad} alt="A colorful Mediterranean salad" />
            <div className="about-hero-note"><Leaf size={15} /><span><b>Fresh choices</b><small>Made for your everyday</small></span></div>
          </div>
        </section>

        <section className="about-story-section">
          <div className="about-story-image"><img src={quinoaPowerBowl} alt="A nourishing quinoa power bowl" /><span>Fresh, colorful, and full of flavor</span></div>
          <div className="about-story-copy">
            <span className="home-section-label">OUR STORY</span>
            <h2>Eating well should feel easy.</h2>
            <p>Busy days can make it harder to decide what to eat. HealthyBite is here to make that choice feel simpler, with a curated menu, helpful meal details, and a straightforward way to order.</p>
            <p>From browsing meals to saving favorites and managing your order, we bring the little things together so you can spend less time searching and more time enjoying your food.</p>
            <Link to="/products" className="about-text-link">Find your next favorite <ArrowRight size={15} /></Link>
          </div>
        </section>

        <section className="about-values-section">
          <div className="about-section-heading"><span className="home-section-label">WHAT MATTERS TO US</span><h2>A thoughtful bite, every time.</h2><p>Small details make choosing and enjoying a meal a little better.</p></div>
          <div className="about-value-grid">
            {values.map(({ icon: Icon, title, description }) => <article className="about-value-card" key={title}><span><Icon size={20} /></span><h3>{title}</h3><p>{description}</p></article>)}
          </div>
        </section>

        <section className="about-cta"><div><span className="home-section-label">YOUR NEXT MEAL IS WAITING</span><h2>Make room for a feel-good favorite.</h2><p>Explore the HealthyBite menu and find something delicious for today.</p></div><Link to="/products" className="home-primary">Browse meals <ArrowRight size={16} /></Link></section>
      </main>
      <Footer />
    </div>
  );
}
