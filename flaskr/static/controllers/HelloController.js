class HelloController extends Controller {
  static targets = ["name"];

  connect() {}
}
Stimulus.register("hello", HelloController);
